import type { SeriesLearningExerciseSpec } from "./series-learning-exercises";

export const computerFoundationExercises: Readonly<Record<string, SeriesLearningExerciseSpec>> = {
  c03: {
    chapterIds: ["c03-processor-pipelines", "c03-io-performance"],
    sourceChapterId: "c03-io-performance",
    prompt:
      "一个任务执行2000000 条指令，平均每条1.5 周期，频率为1.5 GHz；随后串行传输200000 字节，启动时间0.1 毫秒，带宽每秒 100000000 字节。求总时间以及处理器计算加速两倍后的总时间。",
    hint: "先由指令数和频率求处理器时间，再把启动和数据传输时间相加。两阶段按题设串行执行。",
    workedSolution:
      "处理器时间为两毫秒，传输阶段为零点一加二，等于两点一毫秒，因此总计四点一毫秒。计算加速两倍后，计算阶段为一毫秒，传输阶段仍为两点一毫秒，总计三点一毫秒。",
    verification:
      "两种方案的时间差均来自计算阶段减少的一毫秒；总加速比为四点一除以三点一，约一点三二。",
  },
  c04: {
    chapterIds: ["c04-threads-synchronization", "c04-file-systems-recovery"],
    sourceChapterId: "c04-file-systems-recovery",
    prompt:
      "两个线程各把同一计数器增加一次，初值为 0。说明未经同步的读改写为何可能只留下计数一，并设计既保护内存更新又向文件提交最终计数的顺序。假设写入成功后还要求文件同步完成。",
    hint: "列出两个线程先后读取零的交错；锁保护共享内存的整个读改写，同步文件还需要单独的系统接口。",
    workedSolution:
      "若两个线程都先读到零，各自加一再写回，最终值为一。用同一互斥锁保护读取、加一和写回后，两次操作顺序执行，最终值为二。等待两线程完成后，由单一写入者把二写入文件，检查写入返回值，再调用文件同步接口并处理错误。",
    verification:
      "互斥后的两次状态变化为零到一、一到二；若文件写入或同步失败，应保留失败状态，不能把内存计数二当作已经持久保存的证据。",
  },
  c05: {
    chapterIds: ["c05-network-layers-delay", "c05-network-measurement"],
    sourceChapterId: "c05-network-measurement",
    prompt:
      "一条单向链路速率为每秒 100000000 位，传播时延为两毫秒。发送1000 字节分组，忽略排队、处理和协议头，求单向到达时间。说明两次不同时间测得的往返时延能否直接推导单向传播时延。",
    hint: "先把字节换成位，计算发送时延，再叠加传播时间；往返测量还包含反向路径与应答处理。",
    workedSolution:
      "分组为八千位，发送时延为零点零八毫秒，加上两毫秒传播，单向到达时间为两点零八毫秒。往返结果还受反向路径、排队和响应端处理影响；只有额外假设路径对称且其他开销已知时才能按相应模型估计单向传播。",
    verification:
      "八千除以一亿等于零点零零零零八秒，换算为零点零八毫秒。若链路速率加倍，传播时延保持两毫秒，单向总时间降为两点零四毫秒。",
  },
  c06: {
    chapterIds: ["c06-transactions-isolation", "c06-database-logging-recovery"],
    sourceChapterId: "c06-database-logging-recovery",
    prompt:
      "账户甲余额 100 元，账户乙余额 50 元，事务把 20 元从甲转入乙。写出事务成功后的余额与总额不变量，并说明日志已提交但部分数据页尚未写回时，重做恢复需要达到什么结果。",
    hint: "扣款和入款属于同一事务；持久提交记录决定事务结果，恢复需把已提交修改反映到数据页。",
    workedSolution:
      "成功后甲为八十、乙为七十，总额仍为一百五十。若持久日志完整记录了该事务且提交已经持久化，恢复应重做尚未反映到数据页的修改，最终恢复到八十与七十。重复应用日志需要依靠日志位置或幂等操作避免重复扣款。",
    verification:
      "恢复后的余额和为八十加七十等于一百五十。只保留扣款会使总额变成一百三十，直接暴露事务原子性被破坏。",
  },
};
