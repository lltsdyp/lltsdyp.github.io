---
title: 'Deepseek Harness：插件运行机制探索'
bigTitle: 'Deepseek Harness：插件运行机制探索'
emphasis: 'Deepseek  Harness'
headline: '{emphasis}：插件运行机制探索'
excerpt: '介绍Deepseek Harness，以及其核心的插件机制，插件的代码实现'
author: 'Zimo Ji'
readTime: '4 Min Read'
date: 2026-09-17
cover: '../../assets/posts/dsh.png'
tags: ['harness engineering', 'deepseek', '笔记']
---

# 0 前言

上个月Deepseek发布了Deepseek Harness这个AI Agent框架，之前忙保研来不及捣鼓这个东西，九月忙的差不多了正好趁着deepseek降价来研究一下。

# 1 环境配置

直接参考 [deepseek harness官方文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.zh.md#run)，如果只是想用web ui，直接

```shell
npx @deepseek-ai/dsh web
```

即可，想要更大的自由度，则从源码安装

```shell
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

非常简单。

# 2 基础使用

deepseek harness作为一个基础框架，提供了一些基本的预设，可以通过 `--profile` 来指定

| Profile       | 用途                                                        | 大致组成                |
| ------------- | ----------------------------------------------------------- | ----------------------- |
| `web`         | **网页交互模式**，普通用户最容易直接使用                    | `base + web-app`        |
| `headless`    | **一次性 CLI Agent 任务**，适合脚本/自动化                  | `base + headless`       |
| `sdk`         | **完整 SDK 模式**，给 Python/TS 等程序调用                  | `base + sdk-app`        |
| `sdk-minimal` | **极简 SDK 模式**，只保留很少的 Agent 能力                  | 独立配置，不使用 `base` |
| `acp`         | **ACP 协议模式**，给支持 Agent Client Protocol 的客户端连接 | `base + acp-app`        |

# 3 插件

Deepseek Harness自称为*everything-is-a-plugin*，其本质上就是由插件组装出来的 _Agent Harness_，为开发者提供了极高的自由度。

下面研究一下Deepseek Harness中的代码

## 3.1 `read.ts`

deepseek-harness官方就提供了一些预设好的plugin，我们以最基础的阅读文件工具[`read.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/fs/tool-fs/src/read.ts) 看起。

这个工具整体代码不是特别复杂，200多行代码，其核心入口位于

```typescript
export function applyReadTool(ctx: Context, caps: ReadToolCaps): void;
```

主要是通过

```typescript
ctx.tools.register(defineTool({...}))
```

这个入口来注册工具。`defineTool`定义工具的时候有下列的这些字段：

| 键                  | 官方语义                                                    |
| ------------------- | ----------------------------------------------------------- |
| `name`              | 工具名，模型调用时使用                                      |
| `description`       | 给模型看的工具说明                                          |
| `parameters`        | 输入参数定义，`defineTool` 会据此做类型推断和参数校验       |
| `output`            | 声明规范输出；通常包含 `schema` 和 `render`                 |
| `execute`           | 实际执行函数，返回 `output.schema` 所声明的 canonical value |
| `isConcurrencySafe` | 声明该工具是否可安全并发执行                                |
| `presentCall`       | 可选 UI 展示：工具调用发生时怎么显示                        |
| `presentResult`     | 可选 UI 展示：工具执行结果怎么显示                          |

详细的描述在[tools.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/tools.md)中。

这里比较难理解的或许就是 `output` 了，他其实由两部分组成，一部分是 `schema`，它定义了 `execute` 实际执行后返回的对象结构，这个同时也是 `render` 这个函数接受的参数对象结构。`output` 相当于在 `execute` 这个函数的后面接一个结构化输出（JS/TS Object）到自然语言（字符串）的一个处理器。比如 read 工具的 `execute` 可能返回：

```
{
  path: "/a.ts",
  offset: 10,
  lines: [
    { number: 10, text: "const x = 1" }
  ],
  totalLines: 100
}
```

经过 `output` 这部分处理后，会产生类似：

```
<path>/a.ts</path>
<type>file</type>
<content>
10: const x = 1
</content>
```

这样的结果。当然，如果 `execute` 因为某些原因没有输出schema规定的结构，就会产生报错。

**WIP**
