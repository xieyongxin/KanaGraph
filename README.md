# KanaGraph

KanaGraph 是一个面向中文日语学习者的纯前端词汇关系工具。它不是词典，也不尝试判断词义关系；它会根据共同假名、最长连续片段和首尾位置，构建属于用户自己的假名形态关系网络。

## 功能

- 输入平假名或片假名，实时发现已学词汇中的形态关联。
- 保存假名、可选汉字和释义，允许同音词独立存在。
- 使用 IndexedDB + Dexie 增量维护全部连续子串 posting 索引。
- 通过可解释的 0–100 分算法建立词汇关系。
- 词汇本支持搜索、分页、编辑、删除和关系详情。
- Cytoscape.js 局部关系图支持一层/两层探索。
- 宽松、均衡、严格三档灵敏度及高级设置。
- JSON 合并导入、覆盖恢复和完整导出。
- 响应式布局、系统/浅色/深色主题。

所有词汇和设置只保存在当前浏览器，不上传到任何服务器。清理浏览器数据前请先导出备份。

## 本地开发

要求 Node.js 24 和 npm。

```bash
npm install
npm run dev
```

打开终端输出的本地地址即可使用。首次启动不会自动写入示例数据。

## 质量检查

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:coverage
npm run test:benchmark
npm run build
```

核心算法验收值：

- `ごはん / はな = 20`
- `ありがとう / ありがたい = 95`

## 数据设计

- `words`：词条和学习时间。
- `postings`：以 `[token+wordId]` 为复合主键的连续子串倒排索引。
- `relations`：无方向词对、共同假名、连续片段和分数。
- `settings`：灵敏度和主题。

片假名会经 NFKC 处理后转换为平假名参与计算；原始输入仍用于展示。浊音、半浊音和小假名保持严格区分。

## Netlify 部署

仓库包含 `netlify.toml`：

- Build command：`npm run build`
- Publish directory：`dist`
- Node：24
- SPA fallback：已配置

在 Netlify 导入本仓库即可部署，不需要环境变量、数据库或 API Key。

## 隐私与限制

- 无账号、后端、云同步和分析脚本。
- 当前关联分数只表示假名形态相似度，不表示语义或词源关系。
- 当前版本不是 PWA；首次打开网站仍需要连接 Netlify。
- 浏览器存储可能受隐私模式、容量策略或手动清理影响。

## License

[MIT](./LICENSE)
