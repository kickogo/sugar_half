// pages/cart/cart.js
const db = wx.cloud.database();

// 静态商品数据（来自 goods.js，所有商品共用）
const ALL_GOODS = [
  { id: 1, name: '芭乐布蕾', desc: '5英寸 · 0.5磅', price: 298, image: '/image/goods/商品_01.png', stampText: 'HOT', category: 'birthday' },
  { id: 2, name: '蓝莓多多', desc: '5英寸 · 0.5磅', price: 328, image: '/image/goods/商品_02.png', stampText: 'NEW', category: 'couple' },
  { id: 3, name: '茉莉玫瑰', desc: '5英寸 · 0.5磅', price: 288, image: '/image/goods/商品_03.png', stampText: '热卖', category: 'celebration' },
  { id: 4, name: '芒果奶油', desc: '5英寸 · 0.5磅', price: 318, image: '/image/goods/商品_04.png', stampText: '热卖', category: 'birthday' },
  { id: 5, name: '草莓甜心', desc: '5英寸 · 0.5磅', price: 308, image: '/image/goods/商品_05.png', stampText: '新品', category: 'kids' },
  { id: 6, name: '巧克力浓郁', desc: '5英寸 · 0.5磅', price: 338, image: '/image/goods/商品_06.png', stampText: '热卖', category: 'couple' },
  { id: 7, name: '抹茶红豆', desc: '5英寸 · 0.5磅', price: 298, image: '/image/goods/商品_07.png', stampText: 'NEW', category: 'seasonal' },
  { id: 8, name: '柠檬清新', desc: '5英寸 · 0.5磅', price: 288, image: '/image/goods/商品_08.png', stampText: '热卖', category: 'giftbox' }
];

// 规格选项（与 goods.js 保持一致）
const SPEC_OPTIONS = {
  size: [
    { name: '6号 2-3人份', price: 0 },
    { name: '8号 4-6人份', price: 40 },
    { name: '10号 8-10人份', price: 80 }
  ],
  filling: ['桑椹莓莓', '芋泥啵啵', '布丁燕麦脆'],
  card: ['需要', '不需要'],
  candle: ['数字蜡烛', '长条蜡烛', '无需蜡烛'],
  mention: ['需要', '不需要'],
  packaging: [
    { name: '礼盒', price: 0 },
    { name: '保冷包', price: 5 }
  ],
  cream: [
    { name: '无需增量', price: 0 },
    { name: '加奶油1份', price: 8 }
  ]
};

Page({
  data: {
    cartItems: [],
    recommendItems: [],
    allChecked: false,
    totalPrice: 0,
    selectedCount: 0,
    loading: false,

    // 规格选项（复用 goods.js 的规格数据）
    specOptions: SPEC_OPTIONS,

    // 规格弹窗状态
    showSpecPopup: false,
    currentEditItem: null,
    selectedSpec: {
      size: '6号 2-3人份',
      filling: '桑椹莓莓',
      card: '不需要',
      candle: '数字蜡烛',
      mention: '不需要',
      packaging: '礼盒',
      cream: '无需增量'
    },
    currentSpecCore: '',
    currentSpecExtra: '',
    editTotalPrice: 0,
    isRecommendAdd: false
  },

  onLoad: function() {
    this.loadCartData();
  },

  onShow: function() {
    this.loadCartData();
  },

  // 加载购物车数据（从云数据库）
  loadCartData: function() {
    wx.showLoading({ title: '加载中...' });

    wx.cloud.callFunction({
      name: 'getCartList',
      data: {},
      success: res => {
        wx.hideLoading();
        if (res.result.success) {
          this.convertToTempUrls(res.result.data);
        } else {
          console.error('[cart] 获取购物车失败:', res.result.errMsg);
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error('[cart] [loadCartData] 调用失败:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });

    // 加载推荐商品
    this.loadRecommendItems();
  },

  // 加载推荐商品
  loadRecommendItems: function() {
    wx.cloud.callFunction({
      name: 'getRecommendGoods',
      success: res => {
        if (res.result.success) {
          this.setData({ recommendItems: res.result.data });
        }
      },
      fail: err => {
        console.error('[cart] [loadRecommendItems] 失败:', err);
      }
    });
  },

  // 解析规格字符串为核心规格和附加选项
  parseSpec: function(specStr) {
    if (!specStr) return { coreSpec: '', extraSpec: '' };
    const parts = specStr.split(' · ');
    // coreSpec: 尺寸 + 夹心（前两项）
    const coreSpec = parts.slice(0, 2).join(' · ');
    // extraSpec: 其余选项（从第3项开始）
    const extraSpec = parts.slice(2).join(' · ');
    return { coreSpec, extraSpec };
  },

  // 解析规格字符串为 selectedSpec 对象（用于回显弹窗选项）
  parseSpecToSelectedSpec: function(specStr) {
    if (!specStr) return null;
    const parts = specStr.split(' · ');
    return {
      size: parts[0] || '6号 2-3人份',
      filling: parts[1] || '桑椹莓莓',
      card: parts[2] || '不需要',
      candle: parts[3] || '数字蜡烛',
      mention: parts[4] || '不需要',
      packaging: parts[5] || '礼盒',
      cream: parts[6] || '无需增量'
    };
  },

  // 计算当前规格的总价
  calcEditTotalPrice: function() {
    const item = this.data.currentEditItem;
    if (!item) return 0;
    const { selectedSpec, specOptions } = this.data;
    let total = item.price;
    const sizeOpt = specOptions.size.find(s => s.name === selectedSpec.size);
    if (sizeOpt) total += sizeOpt.price;
    const packOpt = specOptions.packaging.find(p => p.name === selectedSpec.packaging);
    if (packOpt) total += packOpt.price;
    const creamOpt = specOptions.cream.find(c => c.name === selectedSpec.cream);
    if (creamOpt) total += creamOpt.price;
    return total;
  },

  // 转换云存储URL为临时链接
  convertToTempUrls: function(items, listType) {
    const fileIDs = items
      .filter(item => item.imageUrl && item.imageUrl.startsWith('cloud://'))
      .map(item => item.imageUrl);

    if (fileIDs.length === 0) {
      const list = items.map(item => {
        const { coreSpec, extraSpec } = this.parseSpec(item.spec);
        return {
          ...item,
          displayUrl: item.imageUrl || '',
          coreSpec,
          extraSpec
        };
      });
      if (listType === 'recommend') {
        this.setData({ recommendItems: list });
      } else {
        this.setData({ cartItems: list });
        this.calculateTotal();
      }
      return;
    }

    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        const fileList = res.fileList;
        const urlMap = {};

        fileList.forEach(file => {
          if (file.status === 0) {
            urlMap[file.fileID] = file.tempFileURL;
          } else {
            urlMap[file.fileID] = file.fileID;
          }
        });

        const updatedList = items.map(item => {
          const { coreSpec, extraSpec } = this.parseSpec(item.spec);
          return {
            ...item,
            displayUrl: urlMap[item.imageUrl] || item.imageUrl || '',
            coreSpec,
            extraSpec
          };
        });

        if (listType === 'recommend') {
          this.setData({ recommendItems: updatedList });
        } else {
          this.setData({ cartItems: updatedList });
          this.calculateTotal();
        }
      },
      fail: err => {
        console.error('[cart] [getTempFileURL] 失败:', err);
        const list = items.map(item => {
          const { coreSpec, extraSpec } = this.parseSpec(item.spec);
          return { ...item, coreSpec, extraSpec };
        });
        if (listType === 'recommend') {
          this.setData({ recommendItems: list });
        } else {
          this.setData({ cartItems: list });
          this.calculateTotal();
        }
      }
    });
  },

  // 点击商品卡片 → 打开规格弹窗
  onItemTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.cartItems.find(item => item._id === id);
    if (!item) return;

    // 根据 goodsId 找到静态商品数据
    const goodsItem = ALL_GOODS.find(g => g.id === item.goodsId);
    if (!goodsItem) return;

    // 解析现有规格为 selectedSpec
    const parsedSpec = this.parseSpecToSelectedSpec(item.spec);
    const selectedSpec = parsedSpec || this.data.selectedSpec;
    const coreSpec = `${selectedSpec.size} · ${selectedSpec.filling}`;
    const extraSpec = `${selectedSpec.card} · ${selectedSpec.candle} · ${selectedSpec.mention} · ${selectedSpec.packaging} · ${selectedSpec.cream}`;

    // 计算当前规格价格
    const specOptions = { size: SPEC_OPTIONS.size, packaging: SPEC_OPTIONS.packaging, cream: SPEC_OPTIONS.cream };
    let total = goodsItem.price;
    const sizeOpt = SPEC_OPTIONS.size.find(s => s.name === selectedSpec.size);
    if (sizeOpt) total += sizeOpt.price;
    const packOpt = SPEC_OPTIONS.packaging.find(p => p.name === selectedSpec.packaging);
    if (packOpt) total += packOpt.price;
    const creamOpt = SPEC_OPTIONS.cream.find(c => c.name === selectedSpec.cream);
    if (creamOpt) total += creamOpt.price;

    this.setData({
      showSpecPopup: true,
      currentEditItem: item,
      selectedSpec,
      currentSpecCore: coreSpec,
      currentSpecExtra: extraSpec,
      editTotalPrice: total
    });
  },

  // 点击推荐商品卡片 → 打开规格弹窗（加入购物车模式）
  onRecommendItemTap: function(e) {
    const id = e.currentTarget.dataset.id;
    const item = ALL_GOODS.find(g => g.id === id);
    if (!item) return;

    this.setData({
      showSpecPopup: true,
      currentEditItem: item,
      totalPrice: item.price,
      isRecommendAdd: true,
      selectedSpec: {
        size: '6号 2-3人份',
        filling: '桑椹莓莓',
        card: '不需要',
        candle: '数字蜡烛',
        mention: '不需要',
        packaging: '礼盒',
        cream: '无需增量'
      },
      currentSpecCore: '6号 2-3人份 · 桑椹莓莓',
      currentSpecExtra: '不需要 · 数字蜡烛 · 不需要 · 礼盒 · 无需增量',
      editTotalPrice: item.price
    });
  },

  // 点击规格弹窗选项
  onSpecOptionTap: function(e) {
    const { spec, name, price } = e.currentTarget.dataset;
    const selectedSpec = { ...this.data.selectedSpec, [spec]: name };
    const coreSpec = `${selectedSpec.size} · ${selectedSpec.filling}`;
    const extraSpec = `${selectedSpec.card} · ${selectedSpec.candle} · ${selectedSpec.mention} · ${selectedSpec.packaging} · ${selectedSpec.cream}`;

    this.setData({ selectedSpec, currentSpecCore: coreSpec, currentSpecExtra: extraSpec });
    this.calcEditTotalPrice();
  },

  // 关闭规格弹窗
  onCloseSpecPopup: function() {
    this.setData({ showSpecPopup: false });
  },

  // 确认修改规格 / 加入购物车
  onConfirmSpecEdit: function() {
    const { currentEditItem, selectedSpec, editTotalPrice, isRecommendAdd } = this.data;
    if (!currentEditItem) return;

    const specStr = `${selectedSpec.size} · ${selectedSpec.filling} · ${selectedSpec.card} · ${selectedSpec.candle} · ${selectedSpec.mention} · ${selectedSpec.packaging} · ${selectedSpec.cream}`;

    if (isRecommendAdd) {
      // 推荐商品点击"加入购物车" → 新增商品到购物车
      const newItem = {
        goodsId: currentEditItem.id,
        name: currentEditItem.name,
        spec: specStr,
        price: editTotalPrice,
        quantity: 1,
        imageUrl: currentEditItem.image
      };

      wx.cloud.callFunction({
        name: 'syncCart',
        data: { items: [newItem] },
        success: res => {
          if (res.result.success) {
            wx.showToast({ title: '已加入购物车', icon: 'success' });
            this.setData({ showSpecPopup: false, isRecommendAdd: false });
            this.loadCartData();
          } else {
            wx.showToast({ title: res.result.errMsg, icon: 'none' });
          }
        },
        fail: err => {
          console.error('[cart] [onConfirmSpecEdit] 失败:', err);
          wx.showToast({ title: '添加失败', icon: 'none' });
        }
      });
    } else {
      // 购物车商品点击"确认修改" → 仅更新规格和价格，数量不变
      const updatedItem = {
        ...currentEditItem,
        spec: specStr,
        price: editTotalPrice
      };

      wx.cloud.callFunction({
        name: 'syncCart',
        data: { items: [updatedItem] },
        success: res => {
          if (res.result.success) {
            wx.showToast({ title: '规格已更新', icon: 'success' });
            this.setData({ showSpecPopup: false });
            this.loadCartData();
          } else {
            wx.showToast({ title: res.result.errMsg, icon: 'none' });
          }
        },
        fail: err => {
          console.error('[cart] [onConfirmSpecEdit] 失败:', err);
          wx.showToast({ title: '更新失败', icon: 'none' });
        }
      });
    }
  },

  // 切换单个商品选中状态
  toggleCheck: function(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.cartItems.map(item => {
      if (item._id === id) {
        item.checked = !item.checked;
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.calculateTotal();
    this.updateSingleItem(id, items);
  },

  // 切换全选
  toggleAllCheck: function() {
    const allChecked = !this.data.allChecked;
    const items = this.data.cartItems.map(item => {
      item.checked = allChecked;
      return item;
    });
    this.setData({ cartItems: items, allChecked });
    this.calculateTotal();
  },

  // 数量减少
  decrease: function(e) {
    const id = e.currentTarget.dataset.id;
    let shouldRemove = false;
    let removeId = null;

    const items = this.data.cartItems.map(item => {
      if (item._id === id) {
        const newQty = item.quantity - 1;
        if (newQty < 1) {
          shouldRemove = true;
          removeId = id;
          return null;
        }
        item.quantity = newQty;
      }
      return item;
    }).filter(item => item !== null);

    this.setData({ cartItems: items });
    this.calculateTotal();

    if (shouldRemove) {
      this.removeItem(removeId);
    } else {
      this.updateSingleItem(id, items);
    }
  },

  // 数量增加
  increase: function(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.cartItems.map(item => {
      if (item._id === id) {
        item.quantity += 1;
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.calculateTotal();
    this.updateSingleItem(id, items);
  },

  // 移除商品（数量减到0）
  removeItem: function(id) {
    wx.cloud.callFunction({
      name: 'syncCart',
      data: { deleteId: id },
      fail: err => {
        console.error('[cart] [removeItem] 失败:', err);
      }
    });
  },

  // 计算总价（实时）
  calculateTotal: function() {
    let total = 0;
    let count = 0;
    this.data.cartItems.forEach(item => {
      if (item.checked) {
        total += item.price * item.quantity;
        count += item.quantity;
      }
    });
    this.setData({
      totalPrice: total,
      selectedCount: count
    });
  },

  // 同步单个商品到云端
  updateSingleItem: function(id, items) {
    const item = items.find(item => item._id === id);
    if (!item) return;

    wx.cloud.callFunction({
      name: 'syncCart',
      data: { items: [item] },
      fail: err => {
        console.error('[cart] [updateSingleItem] 失败:', err);
      }
    });
  },

  // 去结算
  goToCheckout: function() {
    const selectedItems = this.data.cartItems.filter(item => item.checked);

    if (selectedItems.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'quickOrder',
      data: {
        cartItems: selectedItems.map(item => ({
          goodsId: item.goodsId,
          spec: item.spec,
          quantity: item.quantity
        })),
        address: {}
      },
      success: res => {
        this.setData({ loading: false });
        if (res.result.success) {
          wx.showToast({ title: '订单创建成功', icon: 'success' });
          this.loadCartData();
        } else {
          wx.showToast({ title: res.result.errMsg, icon: 'none' });
        }
      },
      fail: err => {
        this.setData({ loading: false });
        console.error('[cart] [goToCheckout] 失败:', err);
        wx.showToast({ title: '结算失败', icon: 'none' });
      }
    });
  }
});