import { EquationView, SemanticBlock, SymbolView } from "@one-forth/ui";
import { siteConfig } from "@one-forth/config";
import { notFound } from "next/navigation";
import { DesignSystemControls } from "@/components/design-system-controls";
import { HomeMathField } from "@/components/home-math-field";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "设计系统检查页",
  description: `${siteConfig.name} 排版、语义块、控件与主题质量检查。`,
  path: "/zh-CN/design-system",
  robots: { index: false, follow: false },
});

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main id="main-content" className="design-system-page">
      <header>
        <p className="eyebrow">ONE FORTH · INTERFACE REFERENCE</p>
        <h1>设计系统检查页</h1>
        <p>用于检查数字教材的排版层级、控件状态、学习内容模式、数学对象与响应式边界。</p>
      </header>
      <section id="typography">
        <h2>01 · 排版</h2>
        <div className="type-specimen">
          <div className="type-specimen__row type-specimen__row--display">
            <span>Display · 32–48</span>
            <p>从一个概念开始学习。</p>
          </div>
          <div className="type-specimen__row type-specimen__row--article-title">
            <span>Article H1 · 32–44</span>
            <p>向量：表示方向与大小的数学语言</p>
          </div>
          <div className="type-specimen__row type-specimen__row--h2">
            <span>H2 · 24–30</span>
            <p>线性组合与张成空间</p>
          </div>
          <div className="type-specimen__row type-specimen__row--h3">
            <span>H3 · 19–24</span>
            <p>从基向量开始</p>
          </div>
          <div className="type-specimen__row type-specimen__row--h4">
            <span>H4 · 17–20</span>
            <p>一个二维例子</p>
          </div>
          <div className="type-specimen__row type-specimen__row--body">
            <span>Body · 17–18</span>
            <p>
              矩阵 matrix、向量 vector、数字 3.14159 与公式{" "}
              <span className="inline-math">Ax = b</span> 共享稳定的阅读基线。
            </p>
          </div>
        </div>
      </section>

      <section id="controls">
        <h2>02 · 控件与内容模式</h2>
        <DesignSystemControls />
      </section>

      <section id="learning-patterns">
        <h2>03 · 数学与语义块</h2>
        <div className="design-grid">
          <EquationView id="eq-design" label="式 1 · 波动方程">
            <span className="display-math">∂²u/∂t² = c² ∂²u/∂x²</span>
          </EquationView>
          <p>
            符号提示：
            <SymbolView symbol="c" meaning="波速" unit="m·s⁻¹" /> 在物理命名空间中具有明确单位。
          </p>
          <SemanticBlock kind="intuition" title="直觉">
            <p>如果邻近位置的位移不同，弦的局部张力就会推动形状继续变化。</p>
          </SemanticBlock>
          <SemanticBlock kind="definition" title="定义 1">
            <p>线性映射保持向量加法与数乘。</p>
          </SemanticBlock>
          <SemanticBlock kind="theorem" title="定理 1">
            <p>有限维线性映射在给定基下唯一对应一个矩阵。</p>
          </SemanticBlock>
          <SemanticBlock kind="proof">
            <p>选择基向量的像作为矩阵列，再利用线性性展开任意向量。∎</p>
          </SemanticBlock>
          <SemanticBlock kind="misconception">
            <p>视觉上的“直线”不能单独证明映射线性；必须检查加法与数乘。</p>
          </SemanticBlock>
        </div>
      </section>

      <section>
        <h2>04 · 图形控制</h2>
        <HomeMathField />
      </section>

      <section>
        <h2>05 · 数学对象颜色与动效</h2>
        <div className="object-colors">
          <span data-object="input">输入向量</span>
          <span data-object="output">输出向量</span>
          <span data-object="gradient">梯度</span>
          <span data-object="positive">正方向</span>
          <span data-object="negative">负方向</span>
          <span data-object="wave">位移</span>
        </div>
        <dl className="motion-token-list">
          <div>
            <dt>Fast · 120ms</dt>
            <dd>悬停、焦点和局部状态。</dd>
          </div>
          <div>
            <dt>Base · 180ms</dt>
            <dd>标签页、折叠和轻量位移。</dd>
          </div>
          <div>
            <dt>Panel · 180ms</dt>
            <dd>对话框与抽屉；减少动态时归零。</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
