/**
 * 智能点单数据管理
 */

import type { Catalog, MenuItem, HistoryOrder } from './types'

// 导入本地图片资源
import blackPepperBeefImg from './assets/products/Black_Pepper_Beef_Cube_Skewer.webp'
import cauliflowerImg from './assets/products/Cauliflower_Floret_Skewer.webp'
import chickenCartilageImg from './assets/products/Chicken_Cartilage_and_Meat_Skewer.webp'
import crispyPotatoImg from './assets/products/Crispy_Potato_Slice_Skewer.webp'
import cuminLambImg from './assets/products/Cumin_Lamb_Bite_Skewer.webp'
import icedPlumJuiceImg from './assets/products/Iced_Plum_Juice.webp'
import jasmineMilkTeaImg from './assets/products/Jasmine_Milk_Tea.webp'
import lemonWaterImg from './assets/products/Lemon_Water.webp'
import lotusRootImg from './assets/products/Lotus_Root_Skewer.webp'
import marinatedPorkImg from './assets/products/Marinated_Pork_Loin_Skewer.webp'
import sparklingLemonImg from './assets/products/Sparkling_Lemon_Water.webp'
import spicyChickenImg from './assets/products/Spicy_Chicken_Tender_Skewer.webp'
import sweetCornImg from './assets/products/Sweet_Corn_Segment_Skewer.webp'
import taiwaneseSausageImg from './assets/products/Taiwanese_Sweet_Sausage_Skewer.webp'

const productImages = {
  '黑椒牛肉块串': blackPepperBeefImg,
  '花菜串': cauliflowerImg,
  '鸡软骨肉串': chickenCartilageImg,
  '脆皮土豆片串': crispyPotatoImg,
  '孜然羊肉串': cuminLambImg,
  '冰梅汁': icedPlumJuiceImg,
  '茉莉奶茶': jasmineMilkTeaImg,
  '柠檬水': lemonWaterImg,
  '藕片串': lotusRootImg,
  '腌制猪里脊串': marinatedPorkImg,
  '气泡柠檬水': sparklingLemonImg,
  '辣鸡柳串': spicyChickenImg,
  '甜玉米段串': sweetCornImg,
  '台湾甜香肠串': taiwaneseSausageImg,
}

// ========== 商品目录数据 ==========

export const CATALOG: Catalog = {
  // 我喜欢的
  new: {
    store: '特色串串店',
    items: [
      {
        name: '黑椒牛肉块串',
        price: 12,
        qty: 1,
        img: productImages['黑椒牛肉块串'],
        attrs: { spicy: '微辣', scallion: true, coriander: false },
      },
      {
        name: '孜然羊肉串',
        price: 15,
        qty: 1,
        img: productImages['孜然羊肉串'],
        attrs: { spicy: '中辣', scallion: true, coriander: true },
      },
      {
        name: '腌制猪里脊串',
        price: 10,
        qty: 1,
        img: productImages['腌制猪里脊串'],
        attrs: { spicy: '不辣', scallion: true, coriander: false },
      },
      {
        name: '茉莉奶茶',
        price: 8,
        qty: 1,
        img: productImages['茉莉奶茶'],
        attrs: {},
      },
      {
        name: '冰梅汁',
        price: 6,
        qty: 1,
        img: productImages['冰梅汁'],
        attrs: {},
      },
      {
        name: '柠檬水',
        price: 5,
        qty: 1,
        img: productImages['柠檬水'],
        attrs: {},
      },
      {
        name: '气泡柠檬水',
        price: 7,
        qty: 1,
        img: productImages['气泡柠檬水'],
        attrs: {},
      },
      {
        name: '辣鸡柳串',
        price: 9,
        qty: 1,
        img: productImages['辣鸡柳串'],
        attrs: { spicy: '重辣', scallion: true, coriander: false },
      },
    ],
  },

  // 热门产品
  popular: {
    store: '特色串串店',
    items: [
      {
        name: '黑椒牛肉块串',
        price: 12,
        qty: 1,
        img: productImages['黑椒牛肉块串'],
      },
      {
        name: '脆皮土豆片串',
        price: 6,
        qty: 1,
        img: productImages['脆皮土豆片串'],
      },
      {
        name: '辣鸡柳串',
        price: 9,
        qty: 1,
        img: productImages['辣鸡柳串'],
      },
      {
        name: '台湾甜香肠串',
        price: 8,
        qty: 1,
        img: productImages['台湾甜香肠串'],
      },
      {
        name: '孜然羊肉串',
        price: 15,
        qty: 1,
        img: productImages['孜然羊肉串'],
      },
    ],
  },

  // 常规品
  regular: {
    store: '特色串串店',
    items: [
      {
        name: '花菜串',
        price: 5,
        qty: 1,
        img: productImages['花菜串'],
      },
      {
        name: '鸡软骨肉串',
        price: 11,
        qty: 1,
        img: productImages['鸡软骨肉串'],
      },
      {
        name: '甜玉米段串',
        price: 6,
        qty: 1,
        img: productImages['甜玉米段串'],
      },
      {
        name: '藕片串',
        price: 5,
        qty: 1,
        img: productImages['藕片串'],
      },
    ],
  },

  // 销量排行
  regional: {
    store: '特色串串店',
    items: [
      {
        name: '台湾甜香肠串',
        price: 8,
        qty: 1,
        img: productImages['台湾甜香肠串'],
      },
      {
        name: '腌制猪里脊串',
        price: 10,
        qty: 1,
        img: productImages['腌制猪里脊串'],
      },
      {
        name: '黑椒牛肉块串',
        price: 12,
        qty: 1,
        img: productImages['黑椒牛肉块串'],
      },
      {
        name: '茉莉奶茶',
        price: 8,
        qty: 1,
        img: productImages['茉莉奶茶'],
      },
    ],
  },
}

// ========== 历史订单数据 ==========

export const MOCK_ORDERS: HistoryOrder[] = [
  {
    date: '2025-10-22 18:32',
    items: [
      {
        name: '黑椒牛肉块串',
        qty: 2,
        price: 12,
        attrs: { spicy: '微辣', scallion: true, coriander: false },
      },
      {
        name: '茉莉奶茶',
        qty: 1,
        price: 8,
        attrs: {},
      },
    ],
    total: 32,
  },
  {
    date: '2025-10-19 12:06',
    items: [
      {
        name: '脆皮土豆片串',
        qty: 1,
        price: 6,
        attrs: { spicy: '不辣', scallion: true, coriander: false },
      },
      {
        name: '冰梅汁',
        qty: 2,
        price: 6,
        attrs: {},
      },
    ],
    total: 18,
  },
]

// ========== Schema 指令 ==========

export const SCHEMA_INSTRUCTION = `
你是"AI 点单助手"，需要先判断用户是否在请求产品推荐。

判断标准：
- 如果是请求推荐菜品、点单、搭配、套餐等与食物相关的问题 → 输出产品推荐JSON
- 如果是闲聊、问天气、讲笑话、问时间等非产品推荐问题 → 输出普通对话JSON

**情况1：产品推荐请求** - 输出以下JSON格式：
{
  "type": "product_recommendation",
  "version": "1.0",
  "intent": "<模型理解的用户意图，简短句子>",
  "scenario_tags": ["light" | "couple" | "diet" | "drinks" | "overtime" | "spicy" | "value" ...],
  "reply": {
    "title": "<用于气泡文案的小标题，例如：人气推荐 / 清淡不辣>",
    "intro_html": "<简短 HTML 文案，不超过120字，可包含 <strong>...</strong> 等基础标签>",
    "praise": "<【必填】一句对用户的夸奖或让用户心情愉悦的话，不超过30字>"
  },
  "order": {
    "store": "<门店名>",
    "items": [
      { "name": "<严格从 candidate_items 中选择>", "qty": 1, "unit_price": 12, "img": "<可原样回传>" }
    ]
  },
  "suggested_chips": ["帮我再加一杯茉莉奶茶", "我不想吃太辣的", "描述一下我的历史订单口味如何，无需推荐", "我是清淡口味的", "运动套餐有什么推荐"]
}

**情况2：非产品推荐请求** - 输出以下JSON格式：
{
  "type": "general_chat",
  "reply": {
    "text": "<友好的回复文本，不超过100字>"
  }
}

约束：
1) 产品推荐时只能从 candidate_items 里的 name 中选择菜品，不得编造。
2) qty 必须为正整数；unit_price 为该菜品 price。
3) items 数量 1~8 个，根据用户需求合理组合。
4) 【重要】praise 字段为必填项，必须是对用户的夸奖或让用户心情愉悦的话。
5) 仅输出 JSON，不要输出额外解释或 Markdown。
`.trim()

// ========== 工具函数 ==========

/**
 * 构建候选商品池
 */
export function buildCandidatePool() {
  const pool = { store: '特色串串店', categories: {} as any }
  for (const key of Object.keys(CATALOG)) {
    pool.categories[key] = CATALOG[key].items.map((item: MenuItem) => ({
      name: item.name,
      price: item.price,
      img: item.img,
    }))
  }
  return pool
}

/**
 * 获取默认兜底推荐
 */
export function getFallbackRecommendation() {
  return {
    type: 'product_recommendation' as const,
    order: {
      store: CATALOG.popular.store,
      items: CATALOG.popular.items.slice(0, 3).map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.price,
        unit_price: item.price,
        img: item.img,
      })),
    },
    reply: {
      intro_html: '抱歉，推荐服务开小差了，先给你一个兜底组合～',
    },
    suggested_chips: [
      '我想来点喝的',
      '给我讲一个笑话吧',
      '我不想吃太油腻的',
      '我是清淡口味的',
      '运动套餐有什么推荐',
    ],
  }
}
