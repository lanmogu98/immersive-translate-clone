# Real Pages Test Fixtures

本目录存放真实网页的完整 HTML，用于全面测试翻译功能。

## 文件清单

| 文件名 | 源 URL | 保存日期 | 测试场景 |
|--------|--------|----------|----------|
| `anthropic-blog-skills.html` | https://claude.ai/blog/skills | 待保存 | word divs、br 段落、样式问题 |
| `wikipedia-sutton.html` | https://en.wikipedia.org/wiki/Richard_S._Sutton | 待保存 | 脚注引用、信息框、超链接、表格 |
| `stanford-cs234.html` | https://web.stanford.edu/class/cs234/ | 待保存 | 列表结构、bullet points |

## 保存方法

### 方法 1：查看源代码（推荐）
1. 在浏览器中打开目标网页
2. 右键 → "查看页面源代码" 或 `Ctrl+U` / `Cmd+U`
3. `Ctrl+A` 全选，`Ctrl+C` 复制
4. 粘贴到对应文件中

### 方法 2：DevTools
1. 打开 DevTools（F12）
2. Elements 面板 → 右键 `<html>` 元素
3. Copy → Copy outerHTML
4. 粘贴到对应文件中

## 注意事项

- **保存原始 HTML**：不要保存翻译后的版本
- **等待加载完成**：如果网页有动态内容，等待完全加载后再保存
- **更新日期**：保存后更新上表中的"保存日期"列
- **定期更新**：如果网页内容有重大变化，考虑重新保存

## 与 dom-layout/ 的区别

| 目录 | 用途 | 内容 |
|------|------|------|
| `dom-layout/` | 精简的问题案例 | 只包含触发问题的最小 HTML 片段 |
| `real-pages/` | 真实网页完整 HTML | 用于集成测试、发现新问题 |

## 相关文档

- 详细设计：`docs/DESIGN_REMAINING_ISSUES.md` → Issue 46
- 任务追踪：`FUTURE_ROADMAP.md` → ID 46
