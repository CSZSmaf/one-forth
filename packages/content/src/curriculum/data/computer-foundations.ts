import type { BookBlueprint } from "../blueprint";

export const computerFoundationBooks = [
  {
    code: "C03",
    slug: "computer-organization",
    title: "计算机组成",
    summary: "二进制表示、数字逻辑、指令集、流水线、缓存与输入输出。",
    level: "undergraduate",
    prerequisiteBookIds: ["c00"],
    parts: [
      {
        slug: "representation-logic",
        title: "数据与电路",
        chapters: [
          {
            slug: "binary-representation",
            title: "二进制与数值表示",
            contentId: "binary-representation",
            summary:
              "说明位宽、无符号整数、补码、溢出、字节序与定点比例，并计算编码转换和内存字段。",
          },
          {
            slug: "digital-logic",
            title: "数字逻辑与时序电路",
            contentId: "digital-logic",
            summary:
              "用真值表、全加器、寄存器和状态机分析数字电路，并计算同步路径的周期和时序余量。",
          },
        ],
      },
      {
        slug: "instructions-processors",
        title: "指令与处理器",
        chapters: [
          {
            slug: "isa-assembly",
            title: "指令集与汇编程序",
            contentId: "isa-assembly",
            summary: "按寄存器、内存和程序计数器跟踪汇编指令，计算地址偏移，并分析循环和函数调用。",
          },
          {
            slug: "processor-pipelines",
            title: "处理器与流水线",
            contentId: "processor-pipelines",
            summary:
              "分析五级流水线的执行顺序、转发和暂停，计算延迟、吞吐率以及分支引入的周期代价。",
          },
        ],
      },
      {
        slug: "memory-io",
        title: "存储与设备",
        chapters: [
          {
            slug: "memory-cache",
            title: "存储层次与缓存",
            contentId: "memory-cache",
            summary:
              "分解缓存地址并跟踪访问序列，比较映射冲突、平均访问时间、写策略与数组访问局部性。",
          },
          {
            slug: "io-performance",
            title: "输入输出与性能分析",
            contentId: "io-performance",
            summary:
              "比较轮询、中断和设备传输开销，统一延迟与带宽的单位，并计算完整任务的执行时间和加速比。",
          },
        ],
      },
    ],
  },
  {
    code: "C04",
    slug: "operating-systems",
    title: "操作系统",
    summary: "进程、调度、线程同步、虚拟内存与文件系统。",
    level: "undergraduate",
    prerequisiteBookIds: ["c00", "c03"],
    parts: [
      {
        slug: "processes-scheduling",
        title: "进程与调度",
        chapters: [
          {
            slug: "processes-system-calls",
            title: "进程与系统调用",
            contentId: "processes-system-calls",
            summary:
              "介绍进程状态、用户态与内核态、创建和替换进程、文件描述符以及管道通信，分析执行顺序和资源关闭条件。",
          },
          {
            slug: "cpu-scheduling",
            title: "处理器调度",
            contentId: "cpu-scheduling",
            summary:
              "定义周转、响应与等待时间，比较先到先服务、短任务优先和时间片轮转，并讨论反馈队列、饥饿与多核亲和性。",
          },
        ],
      },
      {
        slug: "concurrency-resources",
        title: "并发与资源",
        chapters: [
          {
            slug: "threads-synchronization",
            title: "线程与同步",
            contentId: "threads-synchronization",
            summary:
              "分析线程共享状态和读改写交错，使用互斥锁、条件变量与信号量维护队列不变量，并区分同步安全性与进展条件。",
          },
          {
            slug: "deadlocks-resource-allocation",
            title: "死锁与资源分配",
            contentId: "deadlocks-resource-allocation",
            summary:
              "使用等待图分析锁依赖，计算多实例资源的剩余需求和安全序列，区分当前死锁与不安全状态，并说明预防和恢复的约束。",
          },
        ],
      },
      {
        slug: "memory-files",
        title: "内存与文件",
        chapters: [
          {
            slug: "virtual-memory-paging",
            title: "虚拟内存与分页",
            contentId: "virtual-memory-paging",
            summary:
              "计算虚拟页号、偏移和物理地址，估计页表容量与地址转换成本，区分转换缓存未命中和缺页，并分析页面置换与工作集。",
          },
          {
            slug: "file-systems-recovery",
            title: "文件系统与崩溃恢复",
            contentId: "file-systems-recovery",
            summary:
              "介绍文件、目录与块索引，计算直接和间接索引的容量，分析多块更新、重做日志及同步接口，并检查不同中断位置的恢复结果。",
          },
        ],
      },
    ],
  },
  {
    code: "C05",
    slug: "computer-networks",
    title: "计算机网络",
    summary: "网络分层、以太网、IP 路由、传输协议与网络测量。",
    level: "undergraduate",
    prerequisiteBookIds: ["c00"],
    parts: [
      {
        slug: "links-delay",
        title: "链路与时延",
        chapters: [
          {
            slug: "network-layers-delay",
            title: "网络分层与时延",
            contentId: "network-layers-delay",
            summary:
              "说明协议封装与网络分层，计算发送、传播、排队和多跳时延，并区分链路速率、有效吞吐量与往返时间。",
          },
          {
            slug: "ethernet-switching",
            title: "以太网与交换",
            contentId: "ethernet-switching",
            summary:
              "分析以太网帧、MAC 地址学习和广播范围，结合 ARP 与 VLAN 说明链路转发，并计算帧开销和有效数据速率。",
          },
        ],
      },
      {
        slug: "routing-transport",
        title: "路由与传输",
        chapters: [
          {
            slug: "ip-addressing-routing",
            title: "IP 地址与路由",
            contentId: "ip-addressing-routing",
            summary:
              "用二进制前缀计算 IPv4 子网与地址聚合，执行最长前缀匹配，并比较 IPv4 和 IPv6 的逐跳转发与分片规则。",
          },
          {
            slug: "udp-tcp-transport",
            title: "UDP 与 TCP",
            contentId: "udp-tcp-transport",
            summary:
              "比较数据报与字节流服务，推算 TCP 序号和累计确认，说明连接状态、接收窗口、拥塞窗口与应用消息边界。",
          },
        ],
      },
      {
        slug: "applications-measurement",
        title: "应用与测量",
        chapters: [
          {
            slug: "dns-http-tls",
            title: "DNS、HTTP 与 TLS",
            contentId: "dns-http-tls",
            summary:
              "说明 DNS 查询和缓存、HTTP 请求及条件验证、TLS 身份认证，按明确的握手假设计量首次 HTTPS 请求的时间。",
          },
          {
            slug: "network-measurement",
            title: "网络测量与故障排查",
            contentId: "network-measurement",
            summary:
              "明确网络测量的端点、协议和时间范围，计算时延分位数与有效吞吐量，并结合地址、连接、ICMP 和抓包结果定位问题。",
          },
        ],
      },
    ],
  },
  {
    code: "C06",
    slug: "databases",
    title: "数据库",
    summary: "关系模型、SQL、数据规范化、索引、事务与恢复。",
    level: "undergraduate",
    prerequisiteBookIds: ["c00", "c01"],
    parts: [
      {
        slug: "relations-queries",
        title: "关系与查询",
        chapters: [
          {
            slug: "relational-model-keys",
            title: "关系模型与键",
            contentId: "relational-model-keys",
            summary:
              "介绍关系、元组、候选键与完整性约束，通过选课数据说明复合主键、外键、空值和投影查询。",
          },
          {
            slug: "sql-joins-aggregation",
            title: "SQL 查询与聚合",
            contentId: "sql-joins-aggregation",
            summary:
              "用学生成绩数据分析等值连接、外连接、分组聚合、空值与重复行，说明筛选位置和统计粒度对结果的影响。",
          },
        ],
      },
      {
        slug: "design-indexes",
        title: "设计与索引",
        chapters: [
          {
            slug: "functional-dependencies-normalization",
            title: "函数依赖与规范化",
            contentId: "functional-dependencies-normalization",
            summary:
              "根据函数依赖计算属性闭包和候选键，分析无损连接、BCNF、第三范式与依赖保持，并给出分解反例。",
          },
          {
            slug: "indexes-query-plans",
            title: "索引与查询计划",
            contentId: "indexes-query-plans",
            summary:
              "从数据页和索引高度估算访问数量，比较扫描与连接算法，说明选择率、执行计划和统计误差的关系。",
          },
        ],
      },
      {
        slug: "transactions-recovery",
        title: "事务与恢复",
        chapters: [
          {
            slug: "transactions-isolation",
            title: "事务与隔离",
            contentId: "transactions-isolation",
            summary:
              "分析事务边界、丢失更新、写偏差和冲突依赖，结合 PostgreSQL 隔离语义说明加锁、重试与提交确认。",
          },
          {
            slug: "database-logging-recovery",
            title: "数据库日志与恢复",
            contentId: "database-logging-recovery",
            summary:
              "说明缓冲页、预写日志和提交顺序，计算重做恢复结果，并区分检查点、日志归档、备份与时间点恢复。",
          },
        ],
      },
    ],
  },
] as const satisfies readonly BookBlueprint[];
