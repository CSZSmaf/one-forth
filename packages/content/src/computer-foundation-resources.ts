import type { ResourceRecord } from "./index";

export const computerFoundationResources = [
  {
    id: "mit-6004-information-2017",
    kind: "lecture",
    title: "1 Basics of Information: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "位序列、信息编码和数值表示的课程讲义与练习。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c1/",
    },
    topics: ["binary-representation"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-combinational-2017",
    kind: "lecture",
    title: "4 Combinational Logic: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "布尔函数、组合电路与逻辑设计练习。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c4/",
    },
    topics: ["digital-logic"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-sequential-2017",
    kind: "lecture",
    title: "5 Sequential Logic: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "寄存器、同步状态与时序约束的课程材料。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c5/",
    },
    topics: ["digital-logic"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-performance-2017",
    kind: "lecture",
    title: "7 Performance Measures: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "延迟、吞吐率和流水计算的度量。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c7/",
    },
    topics: ["processor-pipelines", "io-performance"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-isa-2017",
    kind: "lecture",
    title: "9 Designing an Instruction Set: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "Beta 处理器的指令集设计和寻址方式。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c9/",
    },
    topics: ["isa-assembly"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-cache-2017",
    kind: "lecture",
    title: "14 Caches and the Memory Hierarchy: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "缓存组织、映射和存储访问分析。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c14/",
    },
    topics: ["memory-cache"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-pipeline-2017",
    kind: "lecture",
    title: "15 Pipelining the Beta: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "流水阶段、指令相关性和暂停的课程材料。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c15/",
    },
    topics: ["processor-pipelines"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-6004-devices-2017",
    kind: "lecture",
    title: "18 Devices and Interrupts: Computation Structures",
    authors: ["Chris Terman"],
    year: 2017,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "设备寄存器、输入输出和中断机制。",
    },
    links: {
      official: "https://ocw.mit.edu/courses/6-004-computation-structures-spring-2017/pages/c18/",
    },
    topics: ["io-performance"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "riscv-rv32i-20260120",
    kind: "book",
    title: "RV32I Base Integer Instruction Set, Version 2.1",
    publisher: "RISC-V International",
    description: {
      "zh-CN": "RV32I 整数寄存器、算术运算、装载存储和控制转移规范。",
    },
    links: {
      official: "https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html",
    },
    topics: ["binary-representation", "isa-assembly"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "harvard-cs61-reading-2026",
    kind: "lecture",
    title: "CS 61 Textbook Reading Guide",
    publisher: "Harvard University",
    year: 2026,
    description: {
      "zh-CN": "数据表示、汇编、操作系统、存储和同步的课程阅读指引。",
    },
    links: {
      official: "https://cs61.seas.harvard.edu/site/2026/Textbook/",
    },
    topics: ["memory-cache"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ostep-2023",
    kind: "book",
    title: "Operating Systems: Three Easy Pieces",
    authors: ["Remzi H. Arpaci-Dusseau", "Andrea C. Arpaci-Dusseau"],
    year: 2023,
    publisher: "Arpaci-Dusseau Books",
    description: {
      "zh-CN": "操作系统教材，按进程、并发、内存和持久存储提供免费章节、代码与练习。",
    },
    links: {
      official: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    },
    topics: [
      "processes-system-calls",
      "cpu-scheduling",
      "threads-synchronization",
      "deadlocks-resource-allocation",
      "virtual-memory-paging",
      "file-systems-recovery",
    ],
    verifiedAt: "2026-10-25",
  },
  {
    id: "mit-xv6-riscv-2025",
    kind: "book",
    title: "xv6: a simple, Unix-like teaching operating system",
    authors: ["Russ Cox", "Frans Kaashoek", "Robert Morris"],
    year: 2025,
    publisher: "Massachusetts Institute of Technology",
    description: {
      "zh-CN": "MIT 的 RISC-V xv6 教材，讲解系统调用、页表、锁、调度与文件系统实现。",
    },
    links: {
      official: "https://pdos.csail.mit.edu/6.1810/2025/xv6/book-riscv-rev5.pdf",
      code: "https://github.com/mit-pdos/xv6-riscv",
    },
    topics: [
      "processes-system-calls",
      "cpu-scheduling",
      "threads-synchronization",
      "deadlocks-resource-allocation",
      "virtual-memory-paging",
      "file-systems-recovery",
    ],
    verifiedAt: "2026-10-25",
  },
  {
    id: "linux-fsync-manual",
    kind: "software",
    title: "fsync(2) — Linux manual page",
    publisher: "Linux man-pages project",
    description: {
      "zh-CN": "Linux 文件同步接口说明，包含数据、元数据、目录持久化范围和错误返回。",
    },
    links: {
      official: "https://man7.org/linux/man-pages/man2/fsync.2.html",
    },
    topics: ["file-systems-recovery"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "stanford-cs144-2026",
    kind: "lecture",
    title: "CS 144: Introduction to Computer Networking",
    authors: ["Keith Winstein"],
    year: 2026,
    publisher: "Stanford University",
    description: {
      "zh-CN": "斯坦福大学计算机网络课程，包含字节流、TCP 收发端、路由与网络测量实验。",
    },
    links: {
      official: "https://cs144.github.io/",
    },
    topics: ["network-layers-delay"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc791-ipv4",
    kind: "paper",
    title: "RFC 791: Internet Protocol",
    authors: ["J. Postel"],
    year: 1981,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "IPv4 数据报的首部格式、寻址、转发和分片规范。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc791",
    },
    topics: ["network-layers-delay"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc894-ethernet",
    kind: "paper",
    title: "RFC 894: A Standard for the Transmission of IP Datagrams over Ethernet Networks",
    authors: ["Charles Hornig"],
    year: 1984,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "规定 IPv4 数据报在以太网中的类型字段、载荷和填充方式。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc894",
    },
    topics: ["ethernet-switching"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc826-arp",
    kind: "paper",
    title:
      "RFC 826: An Ethernet Address Resolution Protocol: Or Converting Network Protocol Addresses to 48.bit Ethernet Address for Transmission on Ethernet Hardware",
    authors: ["David C. Plummer"],
    year: 1982,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "说明以太网上网络层地址与链路地址之间的查询报文和缓存处理。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc826",
    },
    topics: ["ethernet-switching"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc4632-cidr",
    kind: "paper",
    title:
      "RFC 4632: Classless Inter-domain Routing (CIDR): The Internet Address Assignment and Aggregation Plan",
    authors: ["V. Fuller", "T. Li"],
    year: 2006,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "说明无类别地址前缀、地址分配和路由聚合规则。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc4632",
    },
    topics: ["ip-addressing-routing"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc8200-ipv6",
    kind: "paper",
    title: "RFC 8200: Internet Protocol, Version 6 (IPv6) Specification",
    authors: ["S. Deering", "R. Hinden"],
    year: 2017,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "定义 IPv6 基础首部、扩展首部、逐跳限制和源端分片。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc8200",
    },
    topics: ["ip-addressing-routing"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc768-udp",
    kind: "paper",
    title: "RFC 768: User Datagram Protocol",
    authors: ["J. Postel"],
    year: 1980,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "定义 UDP 端口、报文长度、校验和及数据报服务。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc768",
    },
    topics: ["udp-tcp-transport"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc9293-tcp",
    kind: "paper",
    title: "RFC 9293: Transmission Control Protocol (TCP)",
    authors: ["W. Eddy"],
    year: 2022,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "汇总 TCP 字节流、序号、确认、窗口和连接状态的基础规范。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc9293",
    },
    topics: ["udp-tcp-transport"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc1034-dns",
    kind: "paper",
    title: "RFC 1034: Domain Names - Concepts and Facilities",
    authors: ["P. Mockapetris"],
    year: 1987,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "介绍 DNS 名称空间、服务器、解析器与缓存。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc1034",
    },
    topics: ["dns-http-tls"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc9110-http",
    kind: "paper",
    title: "RFC 9110: HTTP Semantics",
    authors: ["R. Fielding", "M. Nottingham", "J. Reschke"],
    year: 2022,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "定义 HTTP 方法、状态码、条件请求和各版本共享的消息语义。",
    },
    links: {
      official: "https://httpwg.org/specs/rfc9110.html",
    },
    topics: ["dns-http-tls"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc9846-tls13",
    kind: "paper",
    title: "RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3",
    authors: ["E. Rescorla"],
    year: 2026,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "TLS 1.3 的更新规范，定义握手、认证和记录保护，取代 RFC 8446。",
    },
    links: {
      official: "https://datatracker.ietf.org/doc/rfc9846/",
    },
    topics: ["dns-http-tls"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc2330-metrics",
    kind: "paper",
    title: "RFC 2330: Framework for IP Performance Metrics",
    authors: ["V. Paxson", "G. Almes", "J. Mahdavi", "M. Mathis"],
    year: 1998,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "讨论 IP 性能测量中的路径、时钟、样本与统计指标。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc2330",
    },
    topics: ["network-measurement"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "ietf-rfc792-icmp",
    kind: "paper",
    title: "RFC 792: Internet Control Message Protocol",
    authors: ["J. Postel"],
    year: 1981,
    publisher: "RFC Editor",
    description: {
      "zh-CN": "定义 IPv4 的控制消息，包括回显、目的不可达和超时报告。",
    },
    links: {
      official: "https://www.rfc-editor.org/rfc/rfc792",
    },
    topics: ["network-measurement"],
    verifiedAt: "2026-10-25",
  },
  {
    id: "cmu-database-systems-2025",
    kind: "lecture",
    title: "Intro to Database Systems (Fall 2025)",
    description: {
      "zh-CN": "CMU 数据库课程，包含关系模型、SQL、页存储、索引、查询执行、事务和恢复。",
    },
    links: {
      official: "https://15445.courses.cs.cmu.edu/fall2025/",
    },
    topics: [
      "relational-model-keys",
      "sql-joins-aggregation",
      "indexes-query-plans",
      "transactions-isolation",
    ],
    verifiedAt: "2026-10-25",
    publisher: "Carnegie Mellon University",
    authors: ["Andy Pavlo"],
    year: 2025,
  },
  {
    id: "postgresql-17-constraints",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Constraints",
    description: {
      "zh-CN": "PostgreSQL 17 的主键、外键、唯一、非空和检查约束文档。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/ddl-constraints.html",
    },
    topics: ["relational-model-keys"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-sql-tutorial",
    kind: "software",
    title: "PostgreSQL 17 Documentation: The SQL Language",
    description: {
      "zh-CN": "SQL 教程，包含查询、连接、聚合和数据修改。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/tutorial-sql.html",
    },
    topics: ["sql-joins-aggregation"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "berkeley-cs186-database-design",
    kind: "lecture",
    title: "CS 186 Notes: DB Design",
    description: {
      "zh-CN": "数据库设计讲义，介绍函数依赖、BCNF、无损分解与依赖保持。",
    },
    links: {
      official: "https://cs186berkeley.net/notes/note13/",
    },
    topics: ["functional-dependencies-normalization"],
    verifiedAt: "2026-10-25",
    publisher: "University of California, Berkeley",
  },
  {
    id: "database-system-concepts-slides",
    kind: "lecture",
    title: "Database System Concepts, Seventh Edition: Lecture Slides",
    description: {
      "zh-CN": "教材作者提供的配套讲义，涵盖关系设计、存储、索引、事务和恢复。",
    },
    links: {
      official: "https://www.db-book.com/slides-dir/index.html",
    },
    topics: ["functional-dependencies-normalization"],
    verifiedAt: "2026-10-25",
    authors: ["Avi Silberschatz", "Henry F. Korth", "S. Sudarshan"],
    year: 2019,
  },
  {
    id: "postgresql-17-explain",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Using EXPLAIN",
    description: {
      "zh-CN": "执行计划、代价估计、实际统计与测量限制。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/using-explain.html",
    },
    topics: ["indexes-query-plans"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-index-types",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Index Types",
    description: {
      "zh-CN": "按查询运算与数据类型说明 B 树、哈希等索引的用途。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/indexes-types.html",
    },
    topics: ["indexes-query-plans"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-isolation",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Transaction Isolation",
    description: {
      "zh-CN": "PostgreSQL 的事务快照、隔离级别和序列化失败语义。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/transaction-iso.html",
    },
    topics: ["transactions-isolation"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-locking",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Explicit Locking",
    description: {
      "zh-CN": "表锁、行锁、冲突关系与死锁处理。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/explicit-locking.html",
    },
    topics: ["transactions-isolation"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-wal",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Write-Ahead Logging (WAL)",
    description: {
      "zh-CN": "预写日志、数据页持久化与崩溃重做恢复。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/wal-intro.html",
    },
    topics: ["database-logging-recovery"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-async-commit",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Asynchronous Commit",
    description: {
      "zh-CN": "异步提交的确认时机及崩溃时最近事务可能丢失的条件。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/wal-async-commit.html",
    },
    topics: ["database-logging-recovery"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
  {
    id: "postgresql-17-pitr",
    kind: "software",
    title: "PostgreSQL 17 Documentation: Continuous Archiving and Point-in-Time Recovery (PITR)",
    description: {
      "zh-CN": "基准备份、连续日志归档与时间点恢复。",
    },
    links: {
      official: "https://www.postgresql.org/docs/17/continuous-archiving.html",
    },
    topics: ["database-logging-recovery"],
    verifiedAt: "2026-10-25",
    publisher: "PostgreSQL Global Development Group",
    authors: ["PostgreSQL Global Development Group"],
  },
] as const satisfies readonly Omit<
  ResourceRecord,
  "metadataStatus" | "metadataFields" | "metadataNote"
>[];
