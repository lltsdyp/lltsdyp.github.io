---
title: '飞书空间清理 on Mac'
bigTitle: '飞书空间清理 on Mac'
emphasis: '飞书'
headline: '飞书空间清理 on Mac'
excerpt: '命令行操作起来比在飞书点来点去方便多了。。'
author: 'Zimo Ji'
readTime: '4 Min Read'
date: 2026-09-19
cover: 'https://images.unsplash.com/photo-1789829184849-8e7450457c1b?q=80&w=2062&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
tags: ['飞书', 'misc']
---

# Intro

今天清理Mac存储空间时发现飞书莫名其妙占用了特别多的存储空间，起初以为是保留了已退出的账号的聊天记录，但是和AI一起研究了一下，发现主要是缓存占据了大量的空间。虽然飞书可以在设置里面清理缓存，但是似乎清理的不是很干净。尝试直接删除缓存文件发现并不会影响正常使用。

# 步骤（来自AI）

1. 先定义飞书数据目录：

```bash
BASE="$HOME/Library/Containers/com.bytedance.macos.feishu/Data/Library/Application Support/LarkShell"
```

2. 看各账号占用：

```bash
du -sh "$BASE"/aha/users/* 2>/dev/null | sort -h
```

3. 确认当前正在使用的账号。保持飞书打开并操作几下，然后看哪个账号目录刚刚有文件更新：

```bash
for d in "$BASE"/aha/users/*; do
  id=$(basename "$d")
  [ "$id" = "global" ] && continue

  newest=$(find "$d" -type f -exec stat -f '%m %Sm' -t '%Y-%m-%d %H:%M:%S' {} + 2>/dev/null \
    | sort -nr | head -1)

  size=$(du -sh "$d" 2>/dev/null | awk '{print $1}')

  echo "$size  $id  $newest"
done
```

刚刚更新时间变化的那个，通常就是当前账号。

4. 定义当前账号目录，例如：

```bash
CUR="$BASE/aha/users/eda6e773b4ad89136086d11438820d37"
```

把上面的 ID 换成你自己的。

5. 看 `CacheStorage` 占了多少：

```bash
find "$CUR" -type d -name "CacheStorage" -prune \
  -exec du -sh {} \; 2>/dev/null | sort -h
```

如果这里就是几个 GB 的大头，就可以清。

6. **完全退出飞书**，`⌘Q` 退出，不要只是关窗口。

然后删除当前账号的 `CacheStorage`：

```bash
find "$CUR" -type d -name "CacheStorage" -prune \
  -exec rm -rf {} +
```

7. 清理后检查：

```bash
du -sh "$CUR"
```

以及：

```bash
du -sh "$BASE/aha"
```

`CacheStorage` 属于 Electron/Chromium 的 Service Worker 缓存，删除后会重新生成。一般不会删除云端聊天记录或文档，但以后继续使用飞书，缓存还会逐渐变大。

如果想把**所有飞书账号**的 `CacheStorage` 一次清掉，退出飞书后可以用：

```bash
find "$BASE/aha/users" -type d -name "CacheStorage" -prune \
  -exec rm -rf {} +
```

不建议直接删除整个 `aha/users/<账号ID>`，也不要随便删 `IndexedDB`、`Local Storage`、`Cookies`、`*.db` 等目录或文件，因为这些可能涉及登录状态和本地数据。

# 后记

这里的缓存应该主要来源于飞书应用，实测清除缓存后聊天记录不受影响，且理论上聊天记录存放于类似

```
$BASE/sdk_storage/<账号ID>/
```

的路径。

此外，在打开了几个应用后缓存文件夹空间占用快速增长，基本可以实锤这里的Cache来源于飞书应用
