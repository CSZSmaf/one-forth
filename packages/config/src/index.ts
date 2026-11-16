export { readerDirectoryText } from "./reader-directory";
export {
  legacyBookRouteGroups,
  legacyCurriculumRoutes,
  normalizeCurriculumPath,
} from "./curriculum-route-aliases";

export const supportedLocales = ["zh-CN", "en"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

/** Locales intentionally exposed to crawlers and public routes in the current release. */
export const publishedLocales = ["zh-CN"] as const satisfies readonly SupportedLocale[];

export type PublishedLocale = (typeof publishedLocales)[number];

const configuredUrl =
  typeof process === "undefined" ? undefined : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

export const siteConfig = {
  name: "One Forth",
  shortName: "One Forth",
  domain: "one-forth.com",
  url: configuredUrl ?? "https://one-forth.com",
  seoTitle: "One Forth · 数学、物理、计算机与人工智能教材",
  description: "数学、物理、计算机与人工智能教材，附例题、练习和交互实验。",
  defaultLocale: "zh-CN" as const,
  brand: {
    wordmark: "One Forth",
    monogram: "1/4",
    logoLabel: "One Forth 首页",
    logoPath: "/favicon.svg?v=20261019",
  },
  social: {
    github: "https://github.com/CSZSmaf/one-forth",
    x: "",
  },
  projects: {
    ctorch: {
      mark: { letter: "C", dot: "·" },
      url: "https://ctorch.one-forth.com",
      repository: "https://github.com/CSZSmaf/Ctorch",
      downloads: "https://github.com/CSZSmaf/Ctorch/releases/latest",
    },
    chatocr: {
      icon: "/projects/chatocr.svg?v=0.5.4",
      repository: "https://github.com/CSZSmaf/ChatOCR",
      downloads: "https://github.com/CSZSmaf/ChatOCR/releases",
    },
    mogao: {
      icon: "/projects/pageweave-0.9.1.png",
      repository: "https://github.com/CSZSmaf/PageWeave",
      downloads: "https://github.com/CSZSmaf/PageWeave/releases",
    },
  },
  organization: {
    name: "One Forth 编辑组",
    authorId: "one-forth-core",
  },
  profile: {
    name: "One Forth",
    affiliation: "Independent educational project",
    email: "maintainers@example.org",
  },
} as const;

export const uiText = {
  "zh-CN": {
    paperFigure: { open: "放大图示", paper: "论文原文" },
    skipToContent: "跳到正文",
    search: "搜索",
    githubRepository: "GitHub 源码仓库（在新标签页打开）",
    searchPlaceholder: "搜索概念、公式、实验或资源",
    searchDialog: {
      description: "搜索教材章节、概念、方程、实验、学习路径和资源。使用上下方向键选择结果。",
      input: "搜索知识库",
      dismiss: "关闭搜索",
      filters: "筛选",
      domain: "按学科筛选",
      kind: "按类型筛选",
      allDomains: "全部学科",
      allKinds: "全部类型",
      results: "搜索结果",
      examplesTitle: "试试这些关键词",
      examples: ["线性变换", "backprop", "∂", "wave equation"],
      formats: "支持中文、英文、数学符号和 LaTeX。",
      empty: "没有找到“{query}”。",
      emptyHelp: "试试英文别名、公式中的符号，或放宽筛选条件。",
      fullSearch: "打开完整搜索页",
      retry: "重新加载",
      navigate: "选择",
      open: "打开",
    },
    navigation: "学科导航",
    appearance: "外观",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
    menu: "菜单",
    close: "关闭",
    home: "首页",
    graph: "知识图谱",
    learningPaths: "学习路径",
    playground: "实验室",
    resources: "资源",
    updated: "最近修订",
    readChapter: "阅读本章",
    profile: "关于作者",
    authorProfile: "作者资料",
    otherProjects: "作者的其他项目",
    projectsDescription:
      "Ctorch 深度学习框架、拾语聊天与文章整理工具，以及 PageWeave LaTeX 编辑器。",
    projectLinks: {
      repository: "GitHub 仓库",
      downloads: "版本下载",
    },
    contact: "联系",
    ctorch: {
      label: "Ctorch 教程",
      title: "Ctorch",
      description:
        "用 C++ 和 C 编写的深度学习框架，支持张量运算、自动求导和模型训练。教程提供交互演示和 C++ 示例。",
      open: "阅读教程",
    },
    chatocr: {
      title: "拾语 ChatOCR",
      description:
        "Android 本地聊天与文章整理工具。支持微信、QQ 聊天采集和滚动录屏导入，可校对识别结果并导出内容。",
    },
    mogao: {
      title: "PageWeave",
      description:
        "Windows 桌面 LaTeX 编辑器。支持连续页面写作、公式编辑和图片表格插入，可保存 LaTeX 工程并生成 PDF。",
    },
    correctionThanks: "感谢你帮助我们把教材写得更准确、更清楚。",
    readerInterface: {
      glossary: "术语表",
      searchLoadMore: "显示更多结果",
      searchShowing: "已显示 {shown} / {total} 项",
      symbols: "符号表",
      equations: "公式索引",
      resources: "资源与论文",
      subjects: "学科目录",
      updates: "最近更新",
      allUpdates: "全部更新",
      updateList: "更新记录",
      noUpdates: "当前筛选条件下没有更新记录。",
      symbolScope: "学科 / 主题",
      allSymbolScopes: "全部学科与主题",
      symbolSearch: "符号、含义或学科",
      textbookLocation: "教材位置",
      backToChapter: "返回正文",
      graphHelp: "拖动空白区域平移，选择节点查看关系或打开章节。",
      graphMobileHelp: "也可在下方列表中选择节点。",
      searchLoading: "正在加载搜索…",
      searchUnavailable: "搜索暂时无法加载",
      notFound: "页面未找到",
      notFoundHint: "请检查网址，或返回首页查找内容。",
      trainingProgress: "正在训练，进度 {percent}%。",
      trainingCancelled: "训练已取消，可调整参数后重新训练。",
      bookPrerequisites: "先修教材",
      bookContents: "目录",
      library: "教材目录",
      libraryDescription: "数学、物理、计算机与人工智能教材。",
      allBooks: "全部教材",
      booksCount: "{count} 册",
      chaptersCount: "{count} 章",
      bookStructure: "{parts} 编 · {chapters} 章",
      browseSeries: "{series}教材",
      bookDirectory: "本册目录",
      closeBookDirectory: "关闭本册目录",
      relatedBooks: "相关教材",
      references: "参考资料",
      officialSource: "访问来源",
      resourceDescription: "公开课、教材、论文与教程。",
      experimentRetry: "请重试或刷新页面。",
      experimentVerified: "数值核验通过",
      experimentMismatch: "数值核验失败",
      experimentResidual: "残差",
      breadcrumbs: "面包屑",
    },
    textbookHome: {
      descriptor: "数字教材",
      title: "数学、物理、计算机与人工智能教材",
      titleOpening: "数学、物理、",
      titleClosing: "计算机与人工智能教材",
      search: "搜索章节、定义、公式或实验",
      directoryLabel: "教材总目录",
      directoryTitle: "数学、物理、计算机、人工智能",
      fullDirectory: "查看完整目录",
      scale: "课程目录规模",
      seriesUnit: "个系列",
      booksUnit: "册教材",
      partsUnit: "编",
      chaptersUnit: "章目录",
      enterSeries: "进入系列",
      firstBook: "首册",
    },
  },
  en: {
    paperFigure: { open: "Enlarge figure", paper: "Original paper" },
    skipToContent: "Skip to content",
    search: "Search",
    githubRepository: "GitHub source repository (opens in a new tab)",
    searchPlaceholder: "Search concepts, equations, experiments, or resources",
    searchDialog: {
      description:
        "Search chapters, concepts, equations, experiments, learning paths and resources. Use the up and down arrows to select a result.",
      input: "Search the library",
      dismiss: "Close search",
      filters: "Filters",
      domain: "Filter by domain",
      kind: "Filter by type",
      allDomains: "All domains",
      allKinds: "All types",
      results: "Search results",
      examplesTitle: "Try a search",
      examples: ["linear transformation", "backprop", "∂", "wave equation"],
      formats: "Search in Chinese or English, or enter a math symbol or LaTeX.",
      empty: "No results for “{query}”.",
      emptyHelp: "Try an English alias, a symbol from the equation, or a broader filter.",
      fullSearch: "Open the full search page",
      retry: "Try again",
      navigate: "Select",
      open: "Open",
    },
    navigation: "Subject navigation",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    menu: "Menu",
    close: "Close",
    home: "Home",
    graph: "Knowledge graph",
    learningPaths: "Learning paths",
    playground: "Lab",
    resources: "Resources",
    updated: "Last revised",
    readChapter: "Read chapter",
    profile: "About",
    authorProfile: "Author profile",
    otherProjects: "Other projects",
    projectsDescription:
      "Ctorch for deep learning, ChatOCR for organizing chats and articles, and PageWeave for editing LaTeX documents.",
    projectLinks: {
      repository: "GitHub repository",
      downloads: "Downloads",
    },
    contact: "Contact",
    ctorch: {
      label: "Ctorch tutorial",
      title: "Ctorch",
      description:
        "A deep learning framework in C++ and C with tensors, automatic differentiation and model training. The tutorial includes interactive demonstrations and C++ examples.",
      open: "Read the tutorial",
    },
    chatocr: {
      title: "ChatOCR",
      description:
        "An Android app for organizing chats and articles locally. Capture WeChat and QQ conversations or import scrolling recordings, then review and export the recognized content.",
    },
    mogao: {
      title: "PageWeave",
      description:
        "A desktop LaTeX editor for Windows. Write on continuous pages, edit equations, and insert images and tables. Save LaTeX projects and generate PDFs.",
    },
    correctionThanks: "Thank you for helping us make these textbooks more accurate and clear.",
    readerInterface: {
      glossary: "Glossary",
      searchLoadMore: "Show more results",
      searchShowing: "Showing {shown} of {total} results",
      symbols: "Symbol index",
      equations: "Equation index",
      resources: "Resources and papers",
      subjects: "Subject directory",
      updates: "Recent updates",
      allUpdates: "All updates",
      updateList: "Update history",
      noUpdates: "No updates match the current filters.",
      symbolScope: "Subject / topic",
      allSymbolScopes: "All subjects and topics",
      symbolSearch: "Symbol, meaning, or subject",
      textbookLocation: "Textbook location",
      backToChapter: "Back to chapter",
      graphHelp:
        "Drag an empty area to pan. Select a node to see its relationships or open the chapter.",
      graphMobileHelp: "You can also select a node from the list below.",
      searchLoading: "Loading search…",
      searchUnavailable: "Search could not be loaded",
      notFound: "Page not found",
      notFoundHint: "Check the address or return to the home page.",
      trainingProgress: "Training, {percent}% complete.",
      trainingCancelled: "Training cancelled. Adjust the parameters and restart when ready.",
      bookPrerequisites: "Prerequisite textbooks",
      bookContents: "Contents",
      library: "Textbooks",
      libraryDescription: "Textbooks in mathematics, physics, computing and AI.",
      allBooks: "All textbooks",
      booksCount: "{count} books",
      chaptersCount: "{count} chapters",
      bookStructure: "{parts} parts · {chapters} chapters",
      browseSeries: "{series} textbooks",
      bookDirectory: "Book contents",
      closeBookDirectory: "Close book contents",
      relatedBooks: "Related textbooks",
      references: "References",
      officialSource: "Source",
      resourceDescription: "Open courses, textbooks, papers and tutorials.",
      experimentRetry: "Retry or refresh the page.",
      experimentVerified: "Numerical verification passed",
      experimentMismatch: "Numerical verification failed",
      experimentResidual: "Residual",
      breadcrumbs: "Breadcrumbs",
    },
    textbookHome: {
      descriptor: "Digital textbooks",
      title: "Textbooks in mathematics, physics, computing and AI",
      titleOpening: "Mathematics, physics,",
      titleClosing: "computing and AI",
      search: "Search chapters, definitions, equations or experiments",
      directoryLabel: "The textbook library",
      directoryTitle: "Mathematics, physics, computing and AI",
      fullDirectory: "Explore the full library",
      scale: "Curriculum size",
      seriesUnit: "series",
      booksUnit: "textbooks",
      partsUnit: "parts",
      chaptersUnit: "chapters",
      enterSeries: "Explore series",
      firstBook: "Start here",
    },
  },
} as const;

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function isPublishedLocale(value: string): value is PublishedLocale {
  return publishedLocales.includes(value as PublishedLocale);
}

export function localizedUrl(locale: SupportedLocale, path = ""): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}/${locale}${normalized === "/" ? "" : normalized}`;
}

export { experimentMathText } from "./experiment-math";

export { experimentNotation } from "./experiment-notation";
export { learningToolsText } from "./learning-tools";
