/**
 * 资源数据总表
 * ------------------------------------------------------------
 * 使用方法：往 window.RESOURCES 数组里添加对象即可，页面会自动生成卡片、筛选和二维码。
 * 每次改动保存文件后刷新页面生效（浏览器缓存时按 Ctrl/Cmd + Shift + R 强刷）。
 *
 * 字段说明（除 url 外均可省略）
 *   id       唯一标识，建议用英文/数字，用于详情页锚点，例如 #res-quark-001
 *   title    资源标题
 *   desc     一句话描述，建议控制在 40 字以内
 *   category 分类名，自由填写，页面会自动汇总成分类筛选项
 *   pan      网盘标识，见下方 window.PAN_MAP，不在表里的会自动按"其他"显示
 *   url      网盘分享链接（必填）
 *   code     提取码，没有就留空
 *   size     体积描述，例如 "8.6 GB"
 *   tags     标签数组，参与搜索
 *   date     更新日期 YYYY-MM-DD，影响默认排序
 *   top      true 表示置顶
 *   qrImage  可选。若已有一张现成的二维码图片，填图片路径（相对本文件所在目录），
 *            页面会直接显示该图片，不再自动生成二维码。
 */

window.SITE_CONFIG = {
  title: '星球资源 PlanetResource',
  subtitle: '网盘资源索引 · 扫码或复制链接即可转存',
  // 顶部公告，留空则不显示
  notice: '示例数据仅为演示格式，请替换成自己的资源后上线。本页只做链接索引，不提供下载与观看。',
  footerNote: '本站仅提供网盘链接索引，不存储、不托管任何文件，请遵守各网盘服务条款与相关法规。'
};

/** 网盘标识与配色，可自行增删 */
window.PAN_MAP = {
  quark:  { name: '夸克网盘', color: '#3b6bff' },
  baidu:  { name: '百度网盘', color: '#3c7bf0' },
  aliyun: { name: '阿里云盘', color: '#1677ff' },
  uc:     { name: 'UC 网盘',  color: '#f0453a' },
  xunlei: { name: '迅雷网盘', color: '#2aa3ef' },
  tianyi: { name: '天翼云盘', color: '#0a58ca' },
  '115':  { name: '115 网盘', color: '#ff8f1f' },
  '123':  { name: '123 云盘', color: '#00a4ff' },
  weiyun: { name: '腾讯微云', color: '#2ca6f5' },
  mobile: { name: '移动云盘', color: '#1e8fff' },
  pikpak: { name: 'PikPak',   color: '#0d9f6e' },
  other:  { name: '其他',     color: '#6b7280' }
};

window.RESOURCES = [
  {
    id: 'design-font-pack',
    title: '开源中文字体合集（思源系列）',
    desc: '思源黑体、思源宋体全字重打包，商用可并附开源协议说明。',
    category: '设计素材',
    pan: 'quark',
    url: 'https://pan.quark.cn/s/EXAMPLE01',
    code: 'abcd',
    size: '3.2 GB',
    tags: ['字体', '思源', '开源'],
    date: '2026-09-18',
    top: true
  },
  {
    id: 'dev-toolchain',
    title: '常用开发环境离线安装包',
    desc: 'Node、Python、JDK、VS Code 等主流版本的离线安装包，内网机器可用。',
    category: '软件工具',
    pan: 'baidu',
    url: 'https://pan.baidu.com/s/1EXAMPLE02',
    code: 'xy12',
    size: '9.4 GB',
    tags: ['开发工具', '离线安装'],
    date: '2026-09-12'
  },
  {
    id: 'public-course-cs',
    title: '高校公开计算机课程视频合集',
    desc: '公开可共享的课程录像，含讲义 PDF，按章节分目录整理。',
    category: '学习资料',
    pan: 'aliyun',
    url: 'https://www.alipan.com/s/EXAMPLE03',
    code: '',
    size: '26.7 GB',
    tags: ['公开课', '计算机', '讲义'],
    date: '2026-09-05'
  },
  {
    id: 'stock-photo-pack',
    title: '免费可商用图库精选包',
    desc: '按风景、人像、美食分类整理的免版权图片，附授权来源清单。',
    category: '设计素材',
    pan: 'uc',
    url: 'https://drive.uc.cn/s/EXAMPLE04',
    code: '8888',
    size: '5.1 GB',
    tags: ['图库', '免版权'],
    date: '2026-08-28'
  },
  {
    id: 'ebook-openaccess',
    title: '开放版权电子书精选',
    desc: '公版书与开放授权出版物，EPUB 与 PDF 双格式。',
    category: '电子书',
    pan: '123',
    url: 'https://www.123pan.com/s/EXAMPLE05',
    code: '',
    size: '1.8 GB',
    tags: ['电子书', '公版书'],
    date: '2026-08-20'
  },
  {
    id: 'template-ppt',
    title: '工作汇报 PPT 模板汇总',
    desc: '简约商务风格的演示模板，含图标库与配色方案说明。',
    category: '模板文档',
    pan: 'xunlei',
    url: 'https://pan.xunlei.com/s/EXAMPLE06',
    code: 'ppt6',
    size: '780 MB',
    tags: ['PPT', '模板', '办公'],
    date: '2026-08-11'
  }
];
