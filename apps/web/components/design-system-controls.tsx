"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Menu,
  Pause,
  RotateCcw,
  X,
} from "lucide-react";
import { useState } from "react";

const tabs = ["定义", "例题", "练习"] as const;
const views = ["阅读", "实验", "关系"] as const;

export function DesignSystemControls() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("定义");
  const [activeView, setActiveView] = useState<(typeof views)[number]>("阅读");
  const [learningRate, setLearningRate] = useState(0.2);

  return (
    <div className="design-system-stack">
      <div className="specimen-grid">
        <section className="specimen-block" aria-labelledby="button-specimen-title">
          <header>
            <span>Actions</span>
            <h3 id="button-specimen-title">按钮与状态</h3>
          </header>
          <div className="specimen-row">
            <button type="button" className="button button-primary">
              开始学习 <ArrowRight aria-hidden="true" size={16} />
            </button>
            <button type="button" className="button">
              保存状态
            </button>
            <button type="button" className="button" disabled>
              暂不可用
            </button>
            <button type="button" className="icon-button" aria-label="复制链接">
              <Copy aria-hidden="true" size={17} />
            </button>
          </div>
        </section>

        <section className="specimen-block" aria-labelledby="field-specimen-title">
          <header>
            <span>Fields</span>
            <h3 id="field-specimen-title">输入、选择与滑块</h3>
          </header>
          <div className="field-grid">
            <label className="ui-field">
              <span>搜索概念</span>
              <input className="ui-input" type="search" placeholder="例如：梯度" />
            </label>
            <label className="ui-field">
              <span>激活函数</span>
              <select className="ui-select" defaultValue="tanh">
                <option value="relu">ReLU</option>
                <option value="tanh">tanh</option>
                <option value="sigmoid">sigmoid</option>
              </select>
            </label>
            <label className="ui-field ui-field--range">
              <span>
                学习率 η <output>{learningRate.toFixed(2)}</output>
              </span>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={learningRate}
                onChange={(event) => setLearningRate(Number(event.target.value))}
              />
            </label>
            <label className="ui-check">
              <input type="checkbox" defaultChecked />
              <span>
                <Check aria-hidden="true" size={13} />
              </span>
              显示梯度向量
            </label>
          </div>
        </section>
      </div>

      <div className="specimen-grid">
        <section className="specimen-block" aria-labelledby="switcher-specimen-title">
          <header>
            <span>Switchers</span>
            <h3 id="switcher-specimen-title">标签页与分段控件</h3>
          </header>
          <div className="ui-tabs" role="tablist" aria-label="章节视图">
            {tabs.map((tab) => (
              <button
                key={tab}
                id={`tab-${tab}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div
            id={`panel-${activeTab}`}
            className="ui-tab-panel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
          >
            当前显示「{activeTab}」内容。标签页只切换同一上下文中的内容。
          </div>
          <div className="ui-segmented" role="group" aria-label="内容查看方式">
            {views.map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={activeView === view}
                onClick={() => setActiveView(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </section>

        <section className="specimen-block" aria-labelledby="disclosure-specimen-title">
          <header>
            <span>Disclosure</span>
            <h3 id="disclosure-specimen-title">提示、折叠、对话框与抽屉</h3>
          </header>
          <div className="specimen-row">
            <button type="button" className="button ui-tooltip" data-tooltip="状态会保存在此设备">
              焦点提示
            </button>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button type="button" className="button">
                  打开对话框
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="ui-dialog">
                  <Dialog.Title>确认重置实验</Dialog.Title>
                  <Dialog.Description>参数、时间轴与随机种子将回到安全默认值。</Dialog.Description>
                  <div className="ui-dialog__actions">
                    <Dialog.Close className="button">取消</Dialog.Close>
                    <Dialog.Close className="button button-primary">确认重置</Dialog.Close>
                  </div>
                  <Dialog.Close className="icon-button ui-dialog__close" aria-label="关闭对话框">
                    <X aria-hidden="true" size={17} />
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button type="button" className="button">
                  <Menu aria-hidden="true" size={16} /> 打开抽屉
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dialog-overlay" />
                <Dialog.Content className="ui-drawer">
                  <Dialog.Title>本页目录</Dialog.Title>
                  <Dialog.Description>在移动端快速跳到当前章节的小节。</Dialog.Description>
                  <nav className="ui-toc" aria-label="抽屉目录">
                    <a href="#typography">排版令牌</a>
                    <a href="#controls">控件与状态</a>
                    <a href="#learning-patterns">学习内容模式</a>
                  </nav>
                  <Dialog.Close className="icon-button ui-drawer__close" aria-label="关闭抽屉">
                    <X aria-hidden="true" size={17} />
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
          <details className="ui-accordion">
            <summary>为什么需要标准化控件？</summary>
            <p>统一高度、焦点、状态和间距后，同一操作在文章、图谱与实验中会保持相同含义。</p>
          </details>
        </section>
      </div>

      <section className="specimen-block" aria-labelledby="navigation-pattern-title">
        <header>
          <span>Navigation</span>
          <h3 id="navigation-pattern-title">面包屑、分页与目录</h3>
        </header>
        <div className="navigation-specimens">
          <nav className="ui-breadcrumb" aria-label="面包屑示例">
            <a href="#navigation-pattern-title">数学</a>
            <ChevronRight aria-hidden="true" size={14} />
            <a href="#navigation-pattern-title">线性代数</a>
            <ChevronRight aria-hidden="true" size={14} />
            <span aria-current="page">向量</span>
          </nav>
          <nav className="ui-pagination" aria-label="章节分页示例">
            <a href="#navigation-pattern-title">
              <ArrowLeft aria-hidden="true" size={15} />
              <span>
                <small>上一章</small>
                集合与函数
              </span>
            </a>
            <a href="#navigation-pattern-title">
              <span>
                <small>下一章</small>
                线性变换
              </span>
              <ArrowRight aria-hidden="true" size={15} />
            </a>
          </nav>
          <nav className="ui-toc" aria-label="页内目录示例">
            <strong>本页目录</strong>
            <a className="is-current" href="#navigation-pattern-title">
              向量的定义
            </a>
            <a href="#navigation-pattern-title">线性组合</a>
            <a href="#navigation-pattern-title">内积与长度</a>
          </nav>
        </div>
      </section>

      <div className="learning-pattern-grid">
        <article className="ui-resource">
          <span>BOOK · 2016</span>
          <h3>Deep Learning</h3>
          <p>用于补充神经网络、反向传播与优化的系统背景。</p>
          <a href="#learning-patterns">
            查看资源记录 <ExternalLink aria-hidden="true" size={14} />
          </a>
        </article>

        <section className="ui-exercise" aria-labelledby="exercise-title">
          <header>
            <span>练习 03</span>
            <h3 id="exercise-title">检查梯度方向</h3>
          </header>
          <p>对函数 f(x, y) = x² + 2y²，求点 (1, −1) 的梯度，并写出最陡下降方向。</p>
          <details>
            <summary>查看提示</summary>
            <p>先分别对 x 与 y 求偏导，再取梯度的相反方向。</p>
          </details>
        </section>

        <fieldset className="ui-quiz">
          <legend>概念检查</legend>
          <p>下列哪一项会改变二维线性变换的面积缩放？</p>
          <label>
            <input type="radio" name="design-system-quiz" /> 矩阵的行列式绝对值
          </label>
          <label>
            <input type="radio" name="design-system-quiz" /> 坐标轴标签的颜色
          </label>
          <button type="button" className="button">
            检查答案
          </button>
        </fieldset>
      </div>

      <div className="code-table-grid">
        <figure className="ui-code-block">
          <figcaption>
            <span>gradient.ts</span>
            <button type="button" aria-label="复制代码">
              <Copy aria-hidden="true" size={14} /> 复制
            </button>
          </figcaption>
          <pre>
            <code>{`const next = point.map((value, i) =>\n  value - learningRate * gradient[i],\n);`}</code>
          </pre>
        </figure>

        <div
          className="ui-table-wrap"
          tabIndex={0}
          role="region"
          aria-label="学科颜色表，可横向滚动"
        >
          <table className="ui-table">
            <caption>学科与语义色</caption>
            <thead>
              <tr>
                <th>学科</th>
                <th>Token</th>
                <th>用途</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>数学</td>
                <td>domain-mathematics</td>
                <td>节点与小面积强调</td>
              </tr>
              <tr>
                <td>物理</td>
                <td>domain-physics</td>
                <td>单位、波与场</td>
              </tr>
              <tr>
                <td>机器学习</td>
                <td>domain-machine-learning</td>
                <td>模型与训练状态</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <section className="specimen-block" aria-labelledby="figure-control-title">
        <header>
          <span>Figure controls</span>
          <h3 id="figure-control-title">图形控制条</h3>
        </header>
        <div className="ui-figure-control" aria-label="图形控制示例">
          <button type="button" aria-label="后退一步">
            <ArrowLeft aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="暂停">
            <Pause aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="前进一步">
            <ArrowRight aria-hidden="true" size={15} />
          </button>
          <button type="button" aria-label="重置">
            <RotateCcw aria-hidden="true" size={15} />
          </button>
          <progress value="18" max="60" aria-label="图形进度" />
          <output>18 / 60</output>
        </div>
      </section>
    </div>
  );
}
