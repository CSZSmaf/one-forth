import type {
  DiagramElement,
  DiagramTone,
  TeachingFigureData,
  TeachingFigurePanel,
} from "@one-forth/registry";

type LineOptions = Omit<
  Extract<DiagramElement, { kind: "line" }>,
  "kind" | "x1" | "y1" | "x2" | "y2"
>;
const line = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: LineOptions = {},
): DiagramElement => ({ kind: "line", x1, y1, x2, y2, ...options });
const text = (
  x: number,
  y: number,
  value: string,
  anchor: "start" | "middle" | "end" = "middle",
  tone: DiagramTone = "ink",
): DiagramElement => ({ kind: "text", x, y, text: value, anchor, tone, size: 18 });
const math = (
  x: number,
  y: number,
  width: number,
  latex: string,
  label: string,
  tone: DiagramTone = "ink",
  height = 38,
): DiagramElement => ({
  kind: "math",
  x,
  y,
  width,
  height,
  latex,
  label,
  tone,
  align: "center",
  size: 18,
});
const dot = (cx: number, cy: number, tone: DiagramTone = "input", r = 4): DiagramElement => ({
  kind: "circle",
  cx,
  cy,
  r,
  tone,
  fill: "solid",
});
const path = (d: string, tone: DiagramTone = "input", dashed = false): DiagramElement => ({
  kind: "path",
  d,
  tone,
  dashed,
  fill: "none",
  strokeWidth: 2.5,
});
const panel = (
  title: string,
  description: string,
  height: number,
  elements: readonly DiagramElement[],
): TeachingFigurePanel => ({ title, description, width: 320, height, elements });

/** Coordinates are sampled from the stated analytic functions, not illustrative splines. */
function sampledCurve(x0: number, x1: number, y: (t: number) => number, count = 80): string {
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count;
    return `${i === 0 ? "M" : "L"}${(x0 + (x1 - x0) * t).toFixed(2)},${y(t).toFixed(2)}`;
  }).join(" ");
}

function measurementPanel(biased: boolean): TeachingFigurePanel {
  const readings = biased ? [0.72, 0.76, 0.8, 0.84, 0.88] : [-0.9, -0.45, 0, 0.45, 0.9];
  return panel(
    biased ? "零点偏移" : "随机波动",
    biased
      ? "五个示意读数集中在参考值右侧约零点八毫米处。"
      : "五个示意读数分散在参考值两侧，平均偏差为零。",
    250,
    [
      text(160, 27, biased ? "零点偏移" : "随机波动"),
      line(35, 155, 292, 155, { arrow: true }),
      line(150, 55, 150, 170, { dashed: true, tone: "muted" }),
      text(150, 47, "参考值"),
      ...[-1, 0, 1].flatMap((n) => [
        line(150 + 100 * n, 150, 150 + 100 * n, 160),
        text(150 + 100 * n, 185, String(n)),
      ]),
      ...readings.map((n, i) => dot(150 + 100 * n, 112 - (i % 2) * 15)),
      math(35, 206, 260, "(x-x_{\\mathrm{ref}})/\\mathrm{mm}", "示值与参考值之差，单位毫米"),
    ],
  );
}

function superpositionPanel(inPhase: boolean): TeachingFigurePanel {
  const first = sampledCurve(45, 277, (t) => 145 - 34 * Math.sin(2 * Math.PI * t));
  const second = sampledCurve(45, 277, (t) => 145 + 34 * Math.sin(2 * Math.PI * t));
  return panel(
    inPhase ? "同相叠加" : "反相叠加",
    inPhase
      ? "两个等振幅正弦波重合，合成波的振幅为单个波的两倍。"
      : "两波振幅相同、相位相差半个周期，相加后各处位移为零。",
    300,
    [
      text(160, 24, inPhase ? "同相" : "反相"),
      line(45, 145, 290, 145, { tone: "muted", arrow: true }),
      line(45, 225, 45, 48, { tone: "muted", arrow: true }),
      math(5, 33, 55, "u/A", "位移与振幅之比"),
      math(251, 152, 60, "x/\\lambda", "位置与波长之比"),
      text(31, 149, "0"),
      text(31, 81, "2"),
      text(31, 218, "−2"),
      path(first, "input", true),
      ...(inPhase ? [] : [path(second, "output", true)]),
      path(
        sampledCurve(45, 277, (t) => 145 - (inPhase ? 68 : 0) * Math.sin(2 * Math.PI * t)),
        "wave",
      ),
      line(47, 251, 78, 251, { tone: "input", dashed: true }),
      text(84, 257, "分波", "start"),
      line(174, 251, 205, 251, { tone: "wave", strokeWidth: 2.5 }),
      text(211, 257, "合成", "start"),
    ],
  );
}

function workPanel(highPressure: boolean): TeachingFigurePanel {
  const pressureY = highPressure ? 70 : 150;
  return panel(
    highPressure ? "先升压再膨胀" : "先膨胀再升压",
    `两个准静态过程具有相同初态 A 和终态 B，此路径的边界功为 ${highPressure ? 200 : 100} 焦耳。阴影表示压强体积曲线下的面积。`,
    320,
    [
      text(160, 24, highPressure ? "先升压再膨胀" : "先膨胀再升压"),
      {
        kind: "rect",
        x: 140,
        y: pressureY,
        width: 100,
        height: 230 - pressureY,
        tone: "input",
        fill: "tint",
        strokeWidth: 0,
      },
      line(40, 230, 285, 230, { arrow: true }),
      line(40, 230, 40, 61, { arrow: true }),
      math(1, 28, 75, "p/\\mathrm{kPa}", "压强，单位千帕", "ink", 28),
      math(242, 238, 70, "V/\\mathrm{L}", "体积，单位升"),
      text(31, 155, "100", "end"),
      text(31, 75, "200", "end"),
      text(140, 252, "1"),
      text(240, 252, "2"),
      line(40, 150, 140, 150, { tone: "muted", dashed: true }),
      line(40, 70, 240, 70, { tone: "muted", dashed: true }),
      line(140, 230, 140, 150, { tone: "muted", dashed: true }),
      line(240, 230, 240, 70, { tone: "muted", dashed: true }),
      ...(highPressure
        ? [
            line(140, 150, 140, 70, { tone: "input", arrow: true }),
            line(140, 70, 240, 70, { tone: "input", arrow: true }),
          ]
        : [
            line(140, 150, 240, 150, { tone: "input", arrow: true }),
            line(240, 150, 240, 70, { tone: "input", arrow: true }),
          ]),
      dot(140, 150),
      dot(240, 70),
      text(126, 169, "A"),
      text(253, 66, "B"),
      math(
        55,
        278,
        220,
        highPressure ? "W=200\\,\\mathrm J" : "W=100\\,\\mathrm J",
        highPressure ? "功为二百焦耳" : "功为一百焦耳",
      ),
    ],
  );
}

function canonicalPanel(betaEnergy: number): TeachingFigurePanel {
  const excited = Math.exp(-betaEnergy) / (1 + Math.exp(-betaEnergy));
  const ground = 1 - excited;
  return panel(
    betaEnergy === 2 ? "较低温度" : "较高温度",
    `两个非简并能级的能量为零和 epsilon。beta epsilon 等于 ${betaEnergy} 时，基态概率为 ${ground.toFixed(3)}，激发态概率为 ${excited.toFixed(3)}。`,
    290,
    [
      math(70, 7, 190, `\\beta\\varepsilon=${betaEnergy}`, `逆温度乘能隙等于 ${betaEnergy}`),
      line(55, 220, 291, 220, { arrow: true }),
      line(55, 220, 55, 49, { arrow: true }),
      math(3, 3, 50, "p_i", "状态概率"),
      text(43, 224, "0"),
      text(43, 66, "1"),
      ...[
        { x: 95, probability: ground, tone: "input" as const },
        { x: 205, probability: excited, tone: "output" as const },
      ].flatMap(({ x, probability, tone }): DiagramElement[] => [
        {
          kind: "rect",
          x,
          y: 220 - 160 * probability,
          width: 48,
          height: 160 * probability,
          tone,
          fill: "tint",
        },
        text(x + 24, 207 - 160 * probability, probability.toFixed(3)),
      ]),
      math(74, 233, 90, "E_0=0", "基态能量为零"),
      math(174, 233, 110, "E_1=\\varepsilon", "激发态能量为 epsilon"),
    ],
  );
}

function boxStatePanel(n: number): TeachingFigurePanel {
  return panel(
    `第 ${n} 个能量本征态`,
    `无限深方势阱中第 ${n} 个归一化本征态，两个端点波函数均为零，区间内部有 ${n - 1} 个节点。横轴和纵轴均按公式归一化。`,
    285,
    [
      math(105, 6, 120, `n=${n}`, `能级编号 ${n}`),
      line(45, 151, 292, 151, { tone: "muted", arrow: true }),
      line(45, 234, 45, 75, { tone: "muted", arrow: true }),
      line(277, 64, 277, 232, { tone: "muted", strokeWidth: 3 }),
      math(3, 36, 135, "\\phi_n\\sqrt{L/2}", "波函数乘以根号 L 除以二"),
      path(
        sampledCurve(45, 277, (t) => 151 - 65 * Math.sin(n * Math.PI * t)),
        "wave",
      ),
      text(32, 155, "0"),
      text(32, 91, "1"),
      text(32, 221, "−1"),
      math(254, 240, 60, "x/L", "位置与阱宽之比"),
      text(45, 258, "0"),
      text(277, 171, "1"),
      ...(n === 2 ? [dot(161, 151, "wave"), text(161, 184, "节点")] : []),
    ],
  );
}

export const physicsTeachingFigures: readonly TeachingFigureData[] = [
  {
    id: "p00-measurement-bias-spread",
    bookId: "p00",
    conceptId: "measurement-errors",
    title: "零点偏移与重复性",
    caption: "两组示意读数采用相同标尺；整体偏移反映零点误差，散布宽度反映重复性。",
    after: "## 随机误差、系统误差与不确定度",
    panels: [measurementPanel(true), measurementPanel(false)],
  },
  {
    id: "p01-sliding-block-forces",
    bookId: "p01",
    conceptId: "newton-laws",
    title: "水平滑块的受力图",
    caption: "滑块向右滑动，动摩擦力向左；竖直方向平衡，水平合力决定加速度。",
    after:
      '## <span id="自由体图把相互作用变成方程" data-heading-alias="" aria-hidden="true" />自由体图与受力方程',
    panels: [
      panel(
        "水平滑块",
        "水平面上的滑块受到向上的支持力 N、向下的重力 mg、向右的拉力 F 和向左的动摩擦力 f。速度向右，竖直加速度为零。",
        330,
        [
          line(38, 185, 285, 185, { tone: "muted" }),
          { kind: "rect", x: 130, y: 132, width: 60, height: 53, tone: "ink", fill: "surface" },
          dot(160, 159, "ink", 3),
          line(160, 159, 160, 59, { tone: "input", arrow: true }),
          line(160, 159, 160, 259, { tone: "output", arrow: true }),
          line(160, 159, 282, 159, { tone: "positive", arrow: true }),
          line(160, 159, 70, 159, { tone: "negative", arrow: true }),
          math(167, 46, 45, "N", "支持力", "input"),
          math(166, 244, 60, "mg", "重力", "output"),
          math(263, 120, 45, "F", "水平拉力", "positive"),
          math(47, 123, 50, "f_k", "动摩擦力", "negative"),
          line(207, 82, 274, 82, { tone: "muted", dashed: true, arrow: true }),
          math(226, 46, 48, "v", "速度向右", "muted"),
          math(
            35,
            283,
            250,
            "N=mg,\\quad F-f_k=ma",
            "支持力等于重力，拉力减摩擦力等于质量乘加速度",
          ),
        ],
      ),
    ],
  },
  {
    id: "p02-harmonic-phase-orbit",
    bookId: "p02",
    conceptId: "hamilton-equations",
    title: "谐振子的相空间轨道",
    caption: "位置和动量分别用振幅与动量幅值归一化；沿箭头运动一周对应一个周期。",
    after:
      '## <span id="相空间直觉一条轨道同时编码位置与运动趋势" data-heading-alias="" aria-hidden="true" />相空间轨道',
    panels: [
      panel(
        "谐振子相轨道",
        "归一化位置 q 除以 A 为横轴，归一化动量 p 除以 m omega A 为纵轴。轨道是单位圆，沿顺时针方向运动。右端点动量为零，随后向下进入负动量区。",
        330,
        [
          line(34, 158, 297, 158, { arrow: true, tone: "muted" }),
          line(160, 261, 160, 38, { arrow: true, tone: "muted" }),
          {
            kind: "circle",
            cx: 160,
            cy: 158,
            r: 84,
            tone: "input",
            fill: "none",
            strokeWidth: 2.5,
          },
          {
            kind: "path",
            d: "M 244,158 A 84,84 0 0 1 219.4,217.4",
            tone: "input",
            fill: "none",
            arrow: true,
            strokeWidth: 2.5,
          },
          {
            kind: "path",
            d: "M 76,158 A 84,84 0 0 1 100.6,98.6",
            tone: "input",
            fill: "none",
            arrow: true,
            strokeWidth: 2.5,
          },
          math(250, 167, 65, "q/A", "位置除以振幅"),
          math(113, 1, 153, "p/(m\\omega A)", "动量除以动量幅值"),
          text(249, 147, "1"),
          text(68, 147, "−1"),
          text(146, 78, "1"),
          text(144, 247, "−1"),
          dot(244, 158),
          dot(76, 158),
          math(54, 279, 220, "\\omega=\\sqrt{k/m}", "角频率等于根号弹簧常数除以质量"),
        ],
      ),
    ],
  },
  {
    id: "p03-wave-phase-superposition",
    bookId: "p03",
    conceptId: "wave-parameters-superposition",
    title: "相位差与波的叠加",
    caption: "等振幅、同频率的两列波在同一时刻逐点相加：同相时振幅加倍，反相时位移相消。",
    after:
      '## <span id="线性叠加相加的是状态量不是强度" data-heading-alias="" aria-hidden="true" />线性叠加原理',
    panels: [superpositionPanel(true), superpositionPanel(false)],
  },
  {
    id: "p04-point-charge-gauss-surface",
    bookId: "p04",
    conceptId: "coulomb-gauss",
    title: "点电荷与球形 Gauss 面",
    caption: "虚线为球形 Gauss 面的截面。正点电荷的电场沿径向向外，在整个球面上大小相同。",
    after: "## Gauss 定律的积分形式与微分形式",
    panels: [
      panel(
        "点电荷的球面对称电场",
        "正电荷位于球形 Gauss 面中心，八支电场箭头径向向外。虚线圆表示半径 r 的球面截面，电场方向与球面外法向一致。",
        330,
        [
          { kind: "circle", cx: 160, cy: 146, r: 72, tone: "muted", dashed: true, fill: "none" },
          ...Array.from({ length: 8 }, (_, i) => {
            const angle = (i * Math.PI) / 4;
            return line(
              160 + 32 * Math.cos(angle),
              146 + 32 * Math.sin(angle),
              160 + 111 * Math.cos(angle),
              146 + 111 * Math.sin(angle),
              { arrow: true, tone: "input" },
            );
          }),
          { kind: "circle", cx: 160, cy: 146, r: 20, tone: "positive", fill: "tint" },
          math(140, 128, 40, "+q", "正电荷 q", "positive"),
          line(173, 126, 199, 85, { dashed: true, tone: "muted" }),
          math(164, 83, 40, "r", "Gauss 球面半径"),
          math(267, 119, 45, "\\boldsymbol E", "电场沿径向向外", "input"),
          math(
            24,
            275,
            272,
            "E(4\\pi r^2)=q/\\varepsilon_0",
            "电场强度乘球面积等于包围电荷除以真空介电常数",
          ),
        ],
      ),
    ],
  },
  {
    id: "p05-pressure-volume-work",
    bookId: "p05",
    conceptId: "first-law",
    title: "准静态过程的边界功",
    caption: "从同一初态 A 到同一终态 B，两条准静态路径的压强不同，曲线下面积与对外做功随之改变。",
    after:
      '## <span id="移动边界功由外压决定" data-heading-alias="" aria-hidden="true" />移动边界功',
    panels: [workPanel(true), workPanel(false)],
  },
  {
    id: "p06-two-level-boltzmann",
    bookId: "p06",
    conceptId: "canonical",
    title: "二能级系统的正则概率",
    caption: "两个能级均无简并，能量为零与正能隙。温度升高使逆温度减小，激发态的占据概率增加。",
    after:
      '## <span id="配分函数生成热力学量" data-heading-alias="" aria-hidden="true" />配分函数与热力学量',
    panels: [canonicalPanel(2), canonicalPanel(1)],
  },
  {
    id: "p07-box-eigenstates",
    bookId: "p07",
    conceptId: "one-dimensional-systems",
    title: "无限深势阱的前两个本征态",
    caption: "两端硬壁使波函数在端点为零；第二个本征态多一个内部节点，其能量为基态的四倍。",
    after: "## 无限深方势阱",
    panels: [boxStatePanel(1), boxStatePanel(2)],
  },
  {
    id: "p08-light-cone",
    bookId: "p08",
    conceptId: "lorentz-transform",
    title: "时空间隔与光锥",
    caption: "横纵轴采用相同长度标尺；光信号位于斜线边界，类时事件在锥内，类空事件在锥外。",
    after: "## 间隔分类与光锥",
    panels: [
      panel(
        "一维空间中的光锥",
        "纵轴为 ct，横轴为 x，单位均为米且标尺相同。两条光线为 ct 等于正负 x。未来类时区在上方锥内，过去类时区在下方锥内，类空区在两侧。",
        330,
        [
          {
            kind: "path",
            d: "M 160,164 L 52,56 L 268,56 Z M 160,164 L 52,272 L 268,272 Z",
            tone: "input",
            fill: "tint",
            strokeWidth: 0,
          },
          line(39, 285, 281, 43, { tone: "wave" }),
          line(39, 43, 281, 285, { tone: "wave" }),
          line(23, 164, 299, 164, { arrow: true }),
          line(160, 289, 160, 27, { arrow: true }),
          math(237, 171, 75, "x/\\mathrm m", "空间坐标，单位米"),
          math(164, 4, 95, "ct/\\mathrm m", "光速乘时间，单位米"),
          text(185, 94, "未来"),
          text(185, 118, "类时"),
          text(185, 225, "过去"),
          text(185, 248, "类时"),
          text(53, 151, "类空"),
          text(266, 151, "类空"),
          dot(160, 164, "ink", 3),
          math(
            17,
            290,
            286,
            "s^2=c^2\\Delta t^2-\\Delta x^2",
            "时空间隔平方等于光速平方乘时间间隔平方减空间间隔平方",
          ),
        ],
      ),
    ],
  },
  {
    id: "p09-nozzle-continuity",
    bookId: "p09",
    conceptId: "conservation-laws",
    title: "变截面管流的质量守恒",
    caption: "稳态不可压缩流中，截面积减小，平均流速增大；两端的体积流率相等。",
    after: "## 质量守恒",
    panels: [
      panel(
        "喷嘴中的连续流",
        "单入口单出口喷嘴，入口面积为一百平方厘米，平均流速二米每秒；出口面积四十平方厘米，平均流速五米每秒。两端体积流率均为零点零二立方米每秒。管壁形状为示意。",
        330,
        [
          path("M 25,95 L 105,95 C 155,95 173,126 215,126 L 293,126", "ink"),
          path("M 25,215 L 105,215 C 155,215 173,184 215,184 L 293,184", "ink"),
          line(55, 95, 55, 215, { dashed: true, tone: "muted" }),
          line(255, 126, 255, 184, { dashed: true, tone: "muted" }),
          line(39, 155, 79, 155, { arrow: true, tone: "input", strokeWidth: 2.5 }),
          line(190, 155, 290, 155, { arrow: true, tone: "output", strokeWidth: 2.5 }),
          math(1, 41, 150, "A_1=100\\,\\mathrm{cm^2}", "入口面积一百平方厘米", "input"),
          math(166, 73, 152, "A_2=40\\,\\mathrm{cm^2}", "出口面积四十平方厘米", "output"),
          math(1, 226, 150, "V_1=2\\,\\mathrm{m/s}", "入口平均流速二米每秒", "input"),
          math(166, 199, 152, "V_2=5\\,\\mathrm{m/s}", "出口平均流速五米每秒", "output"),
          math(17, 282, 286, "A_1V_1=A_2V_2", "入口面积乘平均流速等于出口面积乘平均流速"),
        ],
      ),
    ],
  },
  {
    id: "p10-lattice-basis",
    bookId: "p10",
    conceptId: "crystal-structure",
    title: "点阵与双原子基元",
    caption: "每个点阵位置放入相同的双原子基元，得到周期结构；圆点与方块表示两种原子。",
    after:
      '## <span id="几何点阵不等于材料结构" data-heading-alias="" aria-hidden="true" />几何点阵与晶体结构',
    panels: [
      panel(
        "一维点阵和基元",
        "上排为间距 a 的一维点阵，下排在每个点阵位置放置一个圆形原子，并在其右侧零点四 a 处放置另一种方形原子。虚线框标出长度 a 的一个原胞。",
        330,
        [
          text(27, 28, "点阵", "start"),
          line(27, 72, 295, 72, { tone: "muted" }),
          ...[50, 130, 210, 290].map((x) => dot(x, 72, "ink")),
          line(50, 102, 130, 102, { arrow: true }),
          math(68, 108, 45, "a", "点阵周期"),
          text(27, 169, "晶体结构", "start"),
          {
            kind: "rect",
            x: 38,
            y: 186,
            width: 80,
            height: 64,
            tone: "muted",
            dashed: true,
            fill: "none",
          },
          ...[50, 130, 210].flatMap((x): DiagramElement[] => [
            dot(x, 219, "input", 8),
            {
              kind: "rect",
              x: x + 25,
              y: 212,
              width: 14,
              height: 14,
              tone: "output",
              fill: "solid",
            },
          ]),
          dot(290, 219, "input", 8),
          math(8, 275, 148, "R_n=na", "点阵位置等于整数 n 乘周期 a"),
          math(157, 275, 160, "\\tau_B=0.4a", "基元中第二种原子的相对位置为零点四 a"),
        ],
      ),
    ],
  },
  {
    id: "p11-heat-equation-stencil",
    bookId: "p11",
    conceptId: "discretization-validation",
    title: "一维热方程的显式差分模板",
    caption: "新时刻的一个网格值由旧时刻的三个邻点加权得到；稳定条件使三个权重均非负。",
    after: "## 稳定性、收敛与适用前提",
    panels: [
      panel(
        "显式热方程差分模板",
        "旧时刻第 i 减一、i 和 i 加一格点分别以 r、一减二 r 和 r 的权重指向新时刻第 i 格点。r 等于热扩散系数乘时间步长除以空间步长平方，一维稳定条件为零到二分之一。",
        350,
        [
          line(35, 219, 284, 219, { tone: "muted", dashed: true }),
          line(35, 79, 284, 79, { tone: "muted", dashed: true }),
          line(60, 210, 153, 88, { tone: "input", arrow: true }),
          line(160, 210, 160, 88, { tone: "positive", arrow: true }),
          line(260, 210, 167, 88, { tone: "input", arrow: true }),
          dot(60, 219),
          dot(160, 219),
          dot(260, 219),
          dot(160, 79, "output", 6),
          math(119, 24, 83, "u_i^{n+1}", "新时刻第 i 个网格值", "output"),
          math(20, 235, 80, "u_{i-1}^{n}", "旧时刻左邻点", "input"),
          math(120, 235, 80, "u_i^{n}", "旧时刻中心点", "input"),
          math(220, 235, 80, "u_{i+1}^{n}", "旧时刻右邻点", "input"),
          math(58, 126, 50, "r", "左邻点权重 r", "input"),
          { kind: "rect", x: 123, y: 151, width: 74, height: 34, fill: "surface", strokeWidth: 0 },
          math(125, 151, 70, "1-2r", "中心点权重一减二 r", "positive", 34),
          math(221, 143, 50, "r", "右邻点权重 r", "input"),
          math(
            12,
            288,
            296,
            "r=\\alpha\\Delta t/\\Delta x^2,\\quad 0\\le r\\le\\tfrac12",
            "无量纲步长比的稳定区间为零到二分之一",
            "ink",
            48,
          ),
        ],
      ),
    ],
  },
  {
    id: "p12-scalar-tree-loop",
    bookId: "p12",
    conceptId: "interactions-diagrams",
    title: "四次标量相互作用的树图与一回路图",
    caption:
      "四条外腿保持一致。增加一个四点顶点和两条内线，振幅从耦合的一阶进入二阶，并产生一个独立回路积分。",
    after: "## 微扰阶数、树图和回路",
    panels: [
      panel(
        "树级四点图",
        "四条外腿连于一个四点顶点，没有内部线和回路。顶点贡献一次耦合 lambda，振幅是一阶。",
        290,
        [
          text(160, 24, "树图"),
          line(53, 73, 160, 145),
          line(53, 217, 160, 145),
          line(160, 145, 267, 73),
          line(160, 145, 267, 217),
          dot(160, 145, "input", 6),
          math(15, 38, 65, "p_1", "入射四动量一"),
          math(15, 217, 65, "p_2", "入射四动量二"),
          math(237, 38, 65, "p_3", "出射四动量三"),
          math(237, 217, 65, "p_4", "出射四动量四"),
          math(67, 252, 192, "\\mathcal M=O(\\lambda)", "树级振幅为耦合的一阶"),
        ],
      ),
      panel(
        "一回路四点图",
        "左顶点连接两条入射外腿，右顶点连接两条出射外腿。两个顶点之间有两条内部线，形成一个回路。此图为二阶振幅的一个通道。",
        290,
        [
          text(160, 24, "一回路"),
          line(47, 73, 110, 145),
          line(47, 217, 110, 145),
          line(210, 145, 273, 73),
          line(210, 145, 273, 217),
          path("M 110,145 C 110,74 210,74 210,145", "input"),
          path("M 110,145 C 110,216 210,216 210,145", "input"),
          dot(110, 145, "input", 6),
          dot(210, 145, "input", 6),
          math(11, 38, 65, "p_1", "入射四动量一"),
          math(11, 217, 65, "p_2", "入射四动量二"),
          math(242, 38, 65, "p_3", "出射四动量三"),
          math(242, 217, 65, "p_4", "出射四动量四"),
          math(67, 252, 192, "\\mathcal M=O(\\lambda^2)", "此一回路图的振幅为耦合的二阶"),
        ],
      ),
    ],
  },
];
