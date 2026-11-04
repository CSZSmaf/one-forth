import { uiText } from "@one-forth/config";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found" id="main-content">
      <p className="eyebrow">404</p>
      <h1>{uiText["zh-CN"].readerInterface.notFound}</h1>
      <p>{uiText["zh-CN"].readerInterface.notFoundHint}</p>
      <div className="button-row">
        <Link className="button button-primary" href="/zh-CN">
          返回首页
        </Link>
        <Link className="button" href="/zh-CN/search">
          搜索知识库
        </Link>
      </div>
    </main>
  );
}
