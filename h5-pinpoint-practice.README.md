# v10 图形题解析闭环补充

本次新增两项能力：

1. 错因定点提示
   - 在图形题判错后，根据用户误点/漏点，生成可点击的“定点提示”按钮。
   - 点击后，题图会对相关热区做单独高亮，帮助用户直接定位错因。
   - 对带分层的题（如 36Y-10 数正方形）会自动切换到对应层级。

2. 回放后再练一遍
   - 在解析打开状态下，支持一键清空当前题答案并退出回放，回到重新作答状态。
   - 用于“先看图上讲解，再立即重做”的训练闭环。

涉及的主要文件：
- `h5-mvp-react/src/lib/hotspotPlayback.ts`
- `h5-mvp-react/src/components/QuestionFigureRenderer.tsx`
- `h5-mvp-react/src/App.tsx`
- `h5-mvp-react/src/styles.css`

校验：
- `cd h5-mvp-react && npx --yes tsc --noEmit`
