---
title: 'ghOSt: Fast & Flexible User-Space Delegation of Linux Scheduling 论文阅读报告'
bigTitle: 'ghOSt: Fast & Flexible User-Space Delegation of Linux Scheduling 论文阅读报告'
emphasis: 'ghOSt'
headline: '{emphasis}: Fast & Flexible User-Space Delegation of Linux Scheduling 论文阅读报告'
excerpt: 'ghOSt将Linux调度策略移至用户态，通过灵活agent实现多策略并存、动态升级与高性能隔离，提升数据中心负载调度效率。'
author: 'Zimo Ji'
readTime: '5 Min Read'
date: 2026-06-30
cover: '../../assets/posts/ghOst.png'
tags: ['sosp', '论文阅读']
---

## 论文研究背景、动机与主要贡献

CPU调度影响吞吐、尾延迟、隔离与安全。此外，不同的负载特征对调度策略的需求也各不相同。定制调度能提升数据中心负载性能，但内核调度器难开发、难调试、难部署，升级常伴随迁移和重启。ghOSt的贡献是将调度策略移到用户态agent，只把稳定机制留在Linux内核；同时支持原生线程、per-CPU与集中式策略、多策略并存、故障隔离和在线升级。

## 论文问题描述或定义

现代数据中心里，不同工作负载对调度器的要求差异很大，但是在内核态部署专用的调度器开销很大。已有的方案要么不透明（用户线程库）、要么难扩展（定制调度器）、要么性能差（BPF）

## 论文提出的新思路、新理论、或新方法

ghOSt用内核调度类、用户态agent和enclave管理CPU。ghOSt实现了一个新的scheduling class。这个调度类本身不写死复杂策略而是由用户态agent控制进程调度策略。enclave用于划分CPU分区，在不同分区上使用不同的调度策略。

## 论文方法的理论分析或实验评估方法与效果

围绕三个问题设计实验。实验包括微基准、RocksDB/Shinjuku、Google Snap、Google Search和安全VM。

1. 使用Microbenchmark测试ghOSt中独有的操作开销：消息投递约265-725 ns，本地调度888 ns，单全局agent经批处理可达百万级调度吞吐
2. 与Shinjuku做对比，证明 ghOSt 既能接近 Shinjuku 的微秒级尾延迟性能，又能比 Shinjuku 更容易支持多 workload 资源共享。
3. 说明真实场景下ghOSt的价值
   - Google Snap与原有的定制内核调度器MicroQuanta做对比，发现在部分大消息尾延迟上更好。
   - Google Search中将ghOSt的定制调度策略与CFS对比，在吞吐量不输 CFS 的情况下，把部分查询的 99% 尾延迟降低约 40%–45%，并显著提高调度策略迭代速度。
   - 在 VM 场景中，ghOSt 能实现与内核版 core scheduling 非常接近、甚至略好的性能，同时提供跨 hyperthread 攻击防护。验证其安全性。

## 总结

ghOSt把调度策略从内核中解耦出来，并允许多个用户态调度策略并行管理不同 CPU 分区，同时还能和 CFS 共存、动态升级、故障回退。但是用户态路径不可避免地引入了开销，密集调度情况下会放大尾延迟。这一思想也可以在后续研究中沿用，实现面向异构资源的统一调度。
