# AI养人网页游戏
# Design System V1.0

Author: ChatGPT
Version: 1.0

---

# 1. Design Philosophy（设计理念）

整个网站不是传统乙游首页，而是陪伴型网页。

首页应该像一个温柔的房间，而不是功能大厅。

原则：

- User 永远是视觉中心
- UI 永远服务于 User
- 保持大量留白
- 页面呼吸感
- 温柔、干净、轻盈

禁止：

- 大Banner
- 红点堆积
- 密集按钮
- 浮夸动画
- 游戏化首页

---

# 2. Design Keywords

关键词：

Cream
Soft
Warm
Minimal
Breathing
Elegant

整体风格：

奶油风
轻毛玻璃
柔和自然光
少女感
治愈系

---

# 3. Layout

开发尺寸：

430 × 932

网页：

max-width:430px

height:100vh

页面居中

---

页面分四层：

Layer 1

Background

↓

Layer 2

User PNG

↓

Layer 3

UI

↓

Layer 4

Popup

所有页面遵循此层级。

---

# 4. Color

Primary Background

#FFF8F7

Secondary

#FFF3F0

Card

rgba(255,255,255,0.55)

Accent Pink

#EFC9D2

Text

#5D5656

Light Text

#8D8686

Success

#A8D5BA

Warning

#F7C87A

---

# 5. Glass

所有卡片：

background:

rgba(255,255,255,0.55)

blur：

20px

border：

1px rgba(255,255,255,0.6)

shadow：

轻阴影

不要厚重。

---

# 6. Radius

页面统一：

Button

20px

Card

24px

Dock

32px

Popup

32px

---

# 7. Spacing

统一：

8

16

24

32

48

禁止出现奇怪间距。

---

# 8. Typography

Logo

36

H1

28

H2

22

Body

16

Small

13

Caption

12

数字：

28

全部统一。

---

# 9. Icons

全部采用：

线性图标。

统一粗细。

统一风格。

禁止混用。

---

# 10. Motion

页面切换：

200ms

淡入

按钮：

缩放95%

User：

轻微呼吸

头发：

微摆动

禁止：

复杂粒子动画。

---

# 11. Home

首页定位：

陪伴。

不是功能中心。

首页只保留：

Good evening

User Name

一句今日文案

User立绘

亲密度

陪伴时长

Dock

Message

Setting

其他功能：

进入二级页面。

---

User要求：

无五官

透明PNG

不可被UI遮挡

占画面约70%

---

Dock

默认：

Community

Wardrobe

Encounter

Merch

展开：

Story

Check-in

以后增加：

Activity

---

# 12. Wardrobe

中心：

User

左：

分类

右：

衣服

底部：

穿戴按钮

整体风格保持首页一致。

---

# 13. Community

目前只有：

世界频道。

不做：

私聊

群组

论坛

首页点击进入即可。

---

# 14. Encounter

抽卡页面。

保持奶油风。

第一版：

不用复杂动画。

以后增加：

SSR

Live2D

卡池。

---

# 15. Merch

展示：

周边。

第一版：

普通商城即可。

---

# 16. Story

剧情阅读。

像电子书。

不要像任务系统。

保持留白。

---

# 17. Global Rule

任何新增功能：

先问：

会不会影响 User？

如果会。

移动位置。

不要缩小 User。

User 永远拥有最高视觉优先级。

---

# 18. Asset Specifications（素材规范）

## 背景素材

文件名：bedroom_day.webp（开发阶段可用 .png）

路径：assets/background/bedroom_day.webp

尺寸：1440×3200px，比例 9:20

风格：二次元奶油风插画，Cream Pink Bedroom

元素：落地窗、白纱窗帘、奶油色木地板、毛绒熊、白色床铺、少量绿植、柔和阳光

禁止画入：UI、人物、文字、Logo、水印

CSS要求：

```css
background-size: cover;
background-position: center;
background-repeat: no-repeat;
background-attachment: fixed;
```

背景切换：

day → bedroom_day.webp（05:00–17:59）

night → bedroom_night.webp（18:00–04:59）

夜晚版素材待出。

---

## User 素材

文件名：user_base.png

路径：assets/user/user_base.png

内容：女主基础体型，正面+背面三视图

要求：

- 无五官
- 透明底 PNG
- 用途：所有服装/发型/配饰的基底层
- 开发时正面单独裁切使用
- 服装图层对齐此基底

User站位：

- 画面中央
- 占屏幕高度 65%~70%
- 背景无需裁切
- UI不允许遮挡人物身体

---

End.
