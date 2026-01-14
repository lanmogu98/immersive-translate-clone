# DOM Layout Test Fixtures

本目录存放中英段落排布问题的测试案例。

## 文件命名规范

- `case-NNN-<description>.html` - 问题案例的原始 HTML
- `case-NNN-expected.html` - 期望的翻译输出 HTML

## 案例清单

| 案例 | 文件 | 问题类型 | 状态 |
|------|------|----------|------|
| #1 | `case-001-word-divs.html` | 重复翻译 + 错误拆分 | 待修复 |
| #2 | `case-002-br-paragraphs.html` | 段落错位 / 合并翻译 | 待修复 |
| #3 | `case-003-translation-style.html` | 全局样式问题 | 待修复 |

## 使用方式

在测试中加载 fixture：

```javascript
const fs = require('fs');
const path = require('path');

function loadFixture(name) {
  const fixturePath = path.join(__dirname, 'fixtures/dom-layout', name);
  return fs.readFileSync(fixturePath, 'utf-8');
}

// 使用
const html = loadFixture('case-001-word-divs.html');
document.body.innerHTML = html;
```

## 相关文档

- 详细设计：`docs/DESIGN_REMAINING_ISSUES.md` → Issue 38
- 任务追踪：`FUTURE_ROADMAP.md` → ID 38
