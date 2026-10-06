---
title: 'CS336 Assignment 1 - BPE and Transformer (1)'
bigTitle: 'CS336 Assignment 1 - BPE and Transformer (1)'
emphasis: ''
headline: 'CS336 Assignment 1 - BPE and Transformer (1)'
excerpt: 'CS336 Assignment1：实现一个ByteLevel分词器和一个Transformer.'
author: 'Zimo Ji'
readTime: '7 Min Read'
date: 2026-09-29
cover: 'https://pub-10335079c4434caeb29ee4048d530c52.r2.dev/2026/09/attention.png'
tags: ['CS336', '笔记']
---

本贴记录CS336的Assignment1实现过程

# BPE

## BPE的训练过程

### Vanilla BPE Training

简言之，BPE的训练过程就是在不断寻找并合并语料中出现频率最高的相邻符号对，直到词表大小达到上限。其核心思想是用频繁出现的局部组合，逐步构造更大的子词单位。
参考[huggingface/tokenizers](https://github.com/huggingface/tokenizers) 中的相关训练代码，BPE的流程大致是：

```
原始文本
→ regex 预切分
→ byte-level 表示
→ 按 BPE merge rank 合并
→ 生成 Vocab, Merges 等信息
```

预切分过程在`PreTokenizer`中，`tk-train`这个模块处理regex预切分后的过程，整个训练流程被组织成了一个流水线 `PipelineTokenizer` .BPE中最关键的合并过程就发生在 `tk-train` 模块的 `BpeTrainer::do_train` 函数中。注释非常之详细，完整的描述了BPE训练过程的完整流程

```rust
    pub fn do_train(
        &self,
        word_counts: &AHashMap<CompactString, u64>,
    ) -> Result<(Vocab, Merges, Vec<AddedToken>)> {
        let mut word_to_id: AHashMap<CompactString, u32> = AHashMap::with_capacity(self.vocab_size);
        let mut id_to_word: Vec<CompactString> = Vec::with_capacity(self.vocab_size);
        let max_token_length: usize = self.max_token_length.unwrap_or(usize::MAX);

        let progress = self.setup_progress();

        //
        // 1. Add all special tokens to the vocabulary
        //
        self.add_special_tokens(&mut word_to_id, &mut id_to_word);

        //
        // 2. Compute the initial alphabet
        //
        self.compute_alphabet(word_counts, &mut word_to_id, &mut id_to_word);

        //
        // 3. Tokenize words
        //
        self.update_progress(&progress, word_counts.len(), "Tokenize words");
        let (mut words, counts) =
            self.tokenize_words(word_counts, &mut word_to_id, &mut id_to_word, &progress);
        self.finalize_progress(&progress, words.len(), "Tokenize words");

        //
        // 4. Count pairs in words
        //
        self.update_progress(&progress, words.len(), "Count pairs");
        let (mut pair_counts, mut where_to_update) = self.count_pairs(&words, &counts, &progress);
        // Insert them in the queue
        let mut queue = OctonaryHeap::with_capacity(pair_counts.len());
        where_to_update.drain().for_each(|(pair, pos)| {
            let count = pair_counts[&pair];
            if count > 0 {
                queue.push(Merge {
                    pair,
                    count: count as u64,
                    pos,
                });
            }
        });
        self.finalize_progress(&progress, words.len(), "Count pairs");

        //
        // 5. Do merges
        //
        self.update_progress(&progress, self.vocab_size, "Compute merges");
        let mut merges: Vec<(Pair, u32)> = vec![];
        loop {
            // Stop as soon as we have a big enough vocabulary
            if word_to_id.len() >= self.vocab_size {
                break;
            }

            let Some(mut top) = queue.pop() else {
                break;
            };

            if top.count != pair_counts[&top.pair] as u64 {
                top.count = pair_counts[&top.pair] as u64;
                queue.push(top);
                continue;
            }

            if top.count < 1 || self.min_frequency > top.count {
                break;
            }

            let part_a = &id_to_word[top.pair.0 as usize];
            let mut part_b = id_to_word[top.pair.1 as usize].as_str();

            // Build new token
            if let Some(prefix) = &self.continuing_subword_prefix
                && let Some(rest) = part_b.strip_prefix(prefix)
            {
                part_b = rest;
            }

            // Insert new token if it does not already exist
            let new_token = format!("{part_a}{part_b}");
            let new_token_id = word_to_id
                .get(&CompactString::from(&new_token))
                .copied()
                .unwrap_or(id_to_word.len() as u32);
            if !word_to_id.contains_key(&CompactString::from(&new_token)) {
                id_to_word.push(CompactString::from(&new_token));
                word_to_id.insert(CompactString::from(&new_token), new_token_id);
            }
            merges.push((top.pair, new_token_id));

            // Merge the new pair in every words
            // Safety: This is just a type assertion, the code below may no longer be safe
            // if the type of `pos` changes
            let pos: &AHashSet<usize> = &top.pos;

            let words_len = words.len();
            // FIXME: doesn't look great
            struct WordPtr(*mut Word);
            // Safety: We do not actually use this for concurrent access to the same memory,
            // only to different chunks within the same allocation.
            unsafe impl Sync for WordPtr {}
            let word_start = WordPtr(words.as_mut_ptr());

            let changes = pos
                .maybe_par_iter()
                .flat_map(|&i| {
                    // We can merge each of these words in parallel here because each position
                    // can be there only once (AHashSet). So this is safe.
                    unsafe {
                        // Edition ≥2021 closures capture the `.0` field (a non-Sync raw
                        // pointer) unless we force whole-struct capture of the Sync wrapper.
                        let word_start = &word_start;
                        assert!(i < words_len);
                        // This is words[i], but avoids needing to go through &T (which triggers UB)
                        let word = word_start.0.add(i);
                        // let word: &mut Word = &mut (*word);
                        (*word)
                            .merge(top.pair.0, top.pair.1, new_token_id, max_token_length)
                            .into_iter()
                            .map(|c| (c, i))
                            .collect::<Vec<_>>()
                    }
                })
                .collect::<Vec<_>>();

            // Introduce new formed pairs
            for ((pair, change), iw) in changes {
                let count = change * counts[iw] as i32;
                *pair_counts.entry(pair).or_default() += count;
                if change > 0 {
                    where_to_update.entry(pair).or_default().insert(iw);
                }
            }
            where_to_update.drain().for_each(|(pair, pos)| {
                let count = pair_counts[&pair];
                if count > 0 {
                    queue.push(Merge {
                        pair,
                        count: count as u64,
                        pos,
                    });
                }
            });

            if let Some(p) = &progress {
                p.inc(1);
            }
            self.emit_json_progress("Compute merges", merges.len(), self.vocab_size);
        }
        self.finalize_progress(&progress, merges.len(), "Compute merges");

        // The vocabulary, keyed by the token string rather than by `word_to_id`'s hash: we have to
        // look the string up in `id_to_word` either way.
        let vocab: Vocab = word_to_id
            .into_iter()
            .map(|(_key, val)| (id_to_word[val as usize].to_string(), val))
            .collect();

        // `merges` holds id pairs, highest priority first; the on-disk form is the two token
        // strings, which is also what `from_vocab_and_merges` re-derives its ranks from. Order is
        // the rank, so it has to be preserved.
        let merges: Merges = merges
            .into_iter()
            .map(|(pair, _new_token_id)| {
                (
                    id_to_word[pair.0 as usize].to_string(),
                    id_to_word[pair.1 as usize].to_string(),
                )
            })
            .collect();

        Ok((vocab, merges, self.special_tokens.clone()))
    }

```

这里主循环使用一个优先队列 `queue` 来实现每次选择一个最高频的pair来做合并， `queue` 中存储的数据结构长这样：

```rust
struct Merge {
    pair: Pair,
    count: u64,
    pos: AHashSet<usize>,
}
```

其中pos代表了和当前这个pair相关的单词在 `words` 中的索引，换句话说就是在 `queue` 中的每一项都存储了一个倒排索引来优化，不必每次遍历所有 `words` 来找到包含当前pair的单词。

有了这个倒排索引，我们就可以方便地知道每次要更新哪些，这里写的很简洁：

```rust
            let changes = pos
                .maybe_par_iter()
                .flat_map(|&i| {
                    // We can merge each of these words in parallel here because each position
                    // can be there only once (AHashSet). So this is safe.
                    unsafe {
                        // Edition ≥2021 closures capture the `.0` field (a non-Sync raw
                        // pointer) unless we force whole-struct capture of the Sync wrapper.
                        let word_start = &word_start;
                        assert!(i < words_len);
                        // This is words[i], but avoids needing to go through &T (which triggers UB)
                        let word = word_start.0.add(i);
                        // let word: &mut Word = &mut (*word);
                        (*word)
                            .merge(top.pair.0, top.pair.1, new_token_id, max_token_length)
                            .into_iter()
                            .map(|c| (c, i))
                            .collect::<Vec<_>>()
                    }
                })
                .collect::<Vec<_>>();

```

## 简单的BPE训练代码实现

根据 Assignment1的要求，我们实现一个简单的BPE训练代码，由于BPE训练时间不在评分测量范围内，我们可以先暂时不用PQ和倒排索引来优化性能，下面是用Python实现的*Vanilla Byte Level BPE* ：

```python
    def train(
        self,
        input_path: PathInput,
        vocab_size: int,
        special_tokens: list[str],
    ) -> None:
        minimum_vocab_size = _BASE_VOCAB_SIZE + len(special_tokens)
        if vocab_size < minimum_vocab_size:
            raise ValueError("vocab_size must be at least 256 plus the number of special tokens")

        if len(special_tokens) != len(set(special_tokens)):
            logger.warning("duplicate special tokens were provided; keeping their first occurrence")
            special_tokens = list(dict.fromkeys(special_tokens))

        logging.info(f"Train corpus path: {input_path}.")
        with Path(input_path).open("r", encoding="utf-8", newline="") as stream:
            corpus = stream.read()
        logging.info("Load corpus done.")

        # Remove special-token spans before counting ordinary byte pairs.
        if special_tokens:
            ordered_special_tokens = sorted(
                special_tokens, key=len, reverse=True
            )
            special_pattern = regex.compile(
                "|".join(
                    regex.escape(token) for token in ordered_special_tokens
                )
            )
            text_segments = regex.splititer(special_pattern, corpus)
        else:
            text_segments = iter((corpus,))

        # Duplicate pre-tokens share a count that weights pair frequencies.
        word_counts: Counter[tuple[bytes, ...]] = Counter(
            tuple(bytes((value,)) for value in pretoken.encode("utf-8"))
            for pretoken in chain.from_iterable(
                pretokenize(segment) for segment in text_segments
            )
        )

        vocab: dict[int, bytes] = {
            token_id: bytes((token_id,))
            for token_id in range(_BASE_VOCAB_SIZE)
        }
        for special_token in special_tokens:
            vocab[len(vocab)] = special_token.encode("utf-8")

        logger.info("byte-level splitting and special token loading done.")

        merges: list[Merge] = []
        while len(vocab) < vocab_size:
            # Show progress per 500 tokens
            if len(merges) % 500 == 0:
                logger.info(f"current vocab_size={len(vocab)}, max vocab_size={vocab_size}.")
            # Recount pairs inside each pre-token, never across its boundary.
            # TODO: Try optimizing training speed with priority queue.
            pair_counts: Counter[Merge] = Counter()
            for word, frequency in word_counts.items():
                for pair in zip(word, word[1:]):
                    pair_counts[pair] += frequency

            if not pair_counts:
                break

            pair = max(pair_counts, key=lambda item: (pair_counts[item], item))
            merged_token = pair[0] + pair[1]
            new_word_counts: Counter[tuple[bytes, ...]] = Counter()

            # Apply the selected merge left to right, without overlapping pairs.
            for word, frequency in word_counts.items():
                merged_word: list[bytes] = []
                index = 0
                while index < len(word):
                    if (
                        index + 1 < len(word)
                        and word[index] == pair[0]
                        and word[index + 1] == pair[1]
                    ):
                        merged_word.append(merged_token)
                        index += 2
                    else:
                        merged_word.append(word[index])
                        index += 1
                new_word_counts[tuple(merged_word)] += frequency

            word_counts = new_word_counts
            merges.append(pair)
            vocab[len(vocab)] = merged_token

        self.vocab = vocab
        self.merges = merges
        self.special_tokens = list(special_tokens)
        self._rebuild_indexes()

    def _rebuild_indexes(self) -> None:
        """Rebuild token-to-ID, merge-rank, and special-token lookup tables."""
        self._token_to_id = {
            token: token_id for token_id, token in self.vocab.items()
        }
        self._merge_ranks = {
            pair: rank for rank, pair in enumerate(self.merges)
        }
        self._special_token_ids = {}
        for special_token in self.special_tokens:
            token_bytes = special_token.encode("utf-8")
            if token_bytes in self._token_to_id:
                self._special_token_ids[special_token] = self._token_to_id[
                    token_bytes
                ]
```

看起来没什么问题，但是跑起来就———有问题了：

首先是内存，我的wsl配置为32GB，OWT训练语料的大小为12GB，但是拿着这里的代码开始训练的时候，问题来了，脚本还没真正开始merge，内存就满了，开始不断地在swap和内存间来回搬运，根据这个现象，我让ChatGPT帮忙分析了一下，问题出在直接读取dataset时，以及

```python
word_counts = Counter(
    tuple(bytes((value,)) for value in pretoken.encode("utf-8"))
    for pretoken in ...
)
```

这一段，我们把每个单词在pretokenize之后又拆成了per-byte的形式并作为一个tuple存储，这就会导致我们等于将所有出现过的单词又复制了一遍，保守估计也会有数G的额外空间占用，而且我们还创建了许多辅助的数据结构，当我们一次性处理12G的数据时，真实的内存占用可能会翻数倍，而且现实也是32G根本不够这里的BPE训练，因此这里的分段处理几乎是必然的选择。

其次是运行时间，主要关注这里的merge循环，最差情况下我们需要执行 `vocab_size - minimum_vocab_size` 次循环，而由于没有优先队列和倒排索引的优化，导致每次都会完整地扫一遍所有可行pair并合并，粗略估算也至少有 O(N^2）的量级，N为词表大小，而且实际情况很可能会比这个要高不少，因为可行pair数一般会远超过词表大小。

### 优化

最直接的，对训练时间的优化方法，就是参考 `tokenizers` 中，实现 优先队列 +倒排索引 的优化，Python中由于GIL的存在，我们暂时无法通过多线程获得收益，而由于作业对Training的效率没有要求，因此这里暂缓实现。

对于空间的优化，我们暂时使用分段的方法作为一个workaround。

## BPE的编码过程

前面训练的过程中，我们最终得到了两样东西：`vocab` 和 `rank` ，其中 `vocab` 很好理解，就是一个token对应的id，那么 `rank` 是用来干什么的呢？比如说对于pre-tokenize得到的 " the"，我们可能会有多种合并方式：我们可以先合并t和h，也可以先合并h和e，那么我们编码过程中得到的token序列就不唯一了，因此，如果我们能定义一个合并的严格偏序关系，这里的冲突也就自然消失了。而在训练的过程中，从优先队列中弹出的顺序天然就构成了一个严格偏序关系，因此我们直接把它拿过来用也是很自然的一件事情。

BPE的编码过程和训练过程非常类似，区别就在于我们这里的合并过程是在“自己探索”还是“按部就班”。

但是，在后续的训练过程中，我们发现关键的瓶颈不在之后的反向传播训练阶段，而是将语料库给encode成tokens的这个阶段，在一开始，完全没有优化的阶段，对一个12G的训练集（OWT Train）做tokenize大约花费了6000s，这个时间甚至可能与真正的GPU上训练相当，因此我们势必要进行一些优化，参考先前对BPE训练过程的分析，我们可以在encode阶段实现多线程并行优化：先做pretokenizer，然后把得到的列表给分配到不同线程分别做encode，实测下来我们的速度提升了十倍有余。

## BPE的解码过程

**WIP**
