import type { LearningPathV3 } from "./learning-paths";

export const computingLearningPaths: readonly LearningPathV3[] = [
  {
    schemaVersion: 3,
    id: "computer-systems",
    title: { "zh-CN": "计算机系统与操作系统", en: "Computer systems and operating systems" },
    summary: {
      "zh-CN": "从指令执行与缓存学习进程、线程、虚拟内存和文件系统。",
      en: "Study instruction execution, caches, processes, threads, virtual memory and file systems.",
    },
    audience: {
      "zh-CN": "具备程序设计基础，希望理解程序运行过程的读者。",
      en: "Readers with programming experience who want to understand how programs execute.",
    },
    prerequisiteChapterIds: ["c00-programs-types-control", "c00-collections-files"],
    stageGoals: [
      {
        "zh-CN": "解释指令执行、流水线与缓存对程序性能的影响。",
        en: "Explain instruction execution, pipelines and cache effects.",
      },
      {
        "zh-CN": "分析进程调度、线程同步、地址转换与文件恢复。",
        en: "Analyze scheduling, synchronization, address translation and recovery.",
      },
    ],
    chapterIds: [
      "c03-binary-representation",
      "c03-digital-logic",
      "c03-isa-assembly",
      "c03-processor-pipelines",
      "c03-memory-cache",
      "c03-io-performance",
      "c04-processes-system-calls",
      "c04-cpu-scheduling",
      "c04-threads-synchronization",
      "c04-deadlocks-resource-allocation",
      "c04-virtual-memory-paging",
      "c04-file-systems-recovery",
    ],
    estimatedHours: 16,
    checkpoints: [
      {
        id: "systems-execution",
        afterChapterId: "c03-io-performance",
        prompt: { "zh-CN": "沿取指、译码、执行和访存过程，说明一次数组读取经过哪些部件。" },
      },
      {
        id: "systems-memory",
        afterChapterId: "c04-virtual-memory-paging",
        prompt: { "zh-CN": "区分缓存未命中、TLB 未命中与缺页，并分别说明后续处理过程。" },
      },
    ],
    exercises: [
      {
        id: "systems-cache-address",
        title: { "zh-CN": "缓存地址划分" },
        chapterIds: ["c03-memory-cache"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "字节寻址的机器使用 32 位地址，直接映射缓存容量为 32 KiB，缓存行为 64 B。求块内偏移、索引和标记的位数。",
        },
        hint: { "zh-CN": "用缓存容量除以行大小得到行数，再分别取以 2 为底的对数。" },
        workedSolution: {
          "zh-CN": "缓存有 32768/64=512 行。块内偏移占 6 位，索引占 9 位，标记占 32-6-9=17 位。",
        },
        verification: { "zh-CN": "512 行乘以每行 64 B 得到 32 KiB；三部分位数之和为 32。" },
      },
      {
        id: "systems-page-address",
        title: { "zh-CN": "虚拟地址转换" },
        chapterIds: ["c04-virtual-memory-paging"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "页大小为 4 KiB，虚拟地址为 0x12345，页表将虚拟页 0x12 映射到物理页框 0x2A。求页内偏移与物理地址。",
        },
        hint: { "zh-CN": "页大小为 2 的 12 次方，低 12 位保持为页内偏移。" },
        workedSolution: { "zh-CN": "页内偏移为 0x345，物理地址为 0x2A×0x1000+0x345=0x2A345。" },
        verification: { "zh-CN": "虚拟地址与物理地址的低 12 位均为 0x345，符合分页地址转换规则。" },
      },
    ],
    nextPath: "networks-and-databases",
  },
  {
    schemaVersion: 3,
    id: "networks-and-databases",
    title: { "zh-CN": "计算机网络与数据库", en: "Computer networks and databases" },
    summary: {
      "zh-CN": "学习网络传输、Web 请求、关系查询、索引与事务。",
      en: "Study network transport, Web requests, relational queries, indexes and transactions.",
    },
    audience: {
      "zh-CN": "具备编程和数据结构基础，希望理解网络服务与数据存储的读者。",
      en: "Readers with programming and data structures who want to understand networked services and storage.",
    },
    prerequisiteChapterIds: ["c00-programs-types-control", "c01-sequences-trees"],
    stageGoals: [
      {
        "zh-CN": "追踪 DNS 查询、TCP 连接与 HTTP 请求，计算链路时延。",
        en: "Trace DNS, TCP and HTTP and calculate link delays.",
      },
      {
        "zh-CN": "编写关系查询，选择索引，分析并发事务与崩溃恢复。",
        en: "Write relational queries, choose indexes and analyze transactions and recovery.",
      },
    ],
    chapterIds: [
      "c05-network-layers-delay",
      "c05-ethernet-switching",
      "c05-ip-addressing-routing",
      "c05-udp-tcp-transport",
      "c05-dns-http-tls",
      "c05-network-measurement",
      "c06-relational-model-keys",
      "c06-sql-joins-aggregation",
      "c06-functional-dependencies-normalization",
      "c06-indexes-query-plans",
      "c06-transactions-isolation",
      "c06-database-logging-recovery",
    ],
    estimatedHours: 16,
    checkpoints: [
      {
        id: "services-request",
        afterChapterId: "c05-network-measurement",
        prompt: {
          "zh-CN": "说明打开一个 HTTPS 页面时，DNS、IP、TCP、TLS 与 HTTP 各自承担的任务。",
        },
      },
      {
        id: "services-transaction",
        afterChapterId: "c06-database-logging-recovery",
        prompt: { "zh-CN": "以银行转账为例，说明事务原子性、隔离与日志恢复分别解决什么问题。" },
      },
    ],
    exercises: [
      {
        id: "services-link-delay",
        title: { "zh-CN": "传输与传播时延" },
        chapterIds: ["c05-network-layers-delay"],
        difficulty: 2,
        prompt: {
          "zh-CN":
            "1500 B 的分组经过 100 Mbit/s 链路，单程传播时延为 2 ms。忽略排队与处理，求从开始发送到最后一位到达的时间。",
        },
        hint: { "zh-CN": "先把分组长度换为位，再将传输时延与传播时延相加。" },
        workedSolution: {
          "zh-CN": "传输时延为 1500×8/100000000 s，即 0.12 ms。总时间为 2.12 ms。",
        },
        verification: {
          "zh-CN":
            "链路速率提高到 1 Gbit/s 时，传输时延降至 0.012 ms，总时间为 2.012 ms；传播时延保持 2 ms。",
        },
      },
      {
        id: "services-lost-update",
        title: { "zh-CN": "事务并发更新" },
        chapterIds: ["c06-transactions-isolation"],
        difficulty: 3,
        prompt: {
          "zh-CN":
            "余额初始为 100。事务 A 和 B 都先读到 100，A 加 20 后写入 120，B 减 10 后写入 90。求最终余额与串行执行的余额，并给出一种修正方法。",
        },
        hint: { "zh-CN": "比较后一次写入与两次更新都生效时的结果，关注读写操作之间的保护范围。" },
        workedSolution: {
          "zh-CN":
            "最终余额为 90，A 的更新丢失。两种串行顺序都得到 110。可以在事务中先锁定余额行，完成读取与更新后再释放锁；也可以使用数据库保证原子性的余额增减语句。",
        },
        verification: {
          "zh-CN": "采用行锁后，第二个事务读取第一个事务提交的结果，得到 100+20-10=110。",
        },
      },
    ],
  },
];
