// pages/cart/cart.js
const db = wx.cloud.database();

Page({
  data: {
    cartItems: [],
    recommendItems: [],
    allChecked: false,
    totalPrice: 0,
    selectedCount: 0,
    loading: false
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
    db.collection('goods')
      .where({ status: 1 })
      .limit(10)
      .get()
      .then(res => {
        this.convertToTempUrls(res.data, 'recommend');
      })
      .catch(err => {
        console.error('[cart] [loadRecommendItems] 失败:', err);
      });
  },

  // 转换云存储URL为临时链接
  convertToTempUrls: function(items, listType) {
    const fileIDs = items
      .filter(item => item.imageUrl && item.imageUrl.startsWith('cloud://'))
      .map(item => item.imageUrl);

    if (fileIDs.length === 0) {
      const list = items.map(item => ({
        ...item,
        displayUrl: item.imageUrl || ''
      }));
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

        const updatedList = items.map(item => ({
          ...item,
          displayUrl: urlMap[item.imageUrl] || item.imageUrl || ''
        }));

        if (listType === 'recommend') {
          this.setData({ recommendItems: updatedList });
        } else {
          this.setData({ cartItems: updatedList });
          this.calculateTotal();
        }
      },
      fail: err => {
        console.error('[cart] [getTempFileURL] 失败:', err);
        if (listType === 'recommend') {
          this.setData({ recommendItems: items });
        } else {
          this.setData({ cartItems: items });
          this.calculateTotal();
        }
      }
    });
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
    this.updateCartOnline(items);
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
    const items = this.data.cartItems.map(item => {
      if (item._id === id && item.quantity > 1) {
        item.quantity -= 1;
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.calculateTotal();
    this.updateCartOnline(items);
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
    this.updateCartOnline(items);
  },

  // 计算总价
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

  // 同步购物车到云端
  updateCartOnline: function(items) {
    // 优化：可改为单个商品增量更新，减少请求次数
    wx.cloud.callFunction({
      name: 'syncCart',
      data: { items: items },
      fail: err => {
        console.error('[cart] [updateCartOnline] 失败:', err);
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
        address: {} // TODO: 接入地址选择组件
      },
      success: res => {
        this.setData({ loading: false });
        if (res.result.success) {
          wx.showToast({ title: '订单创建成功', icon: 'success' });
          // 刷新购物车
          this.loadCartData();
          // TODO: 跳转到订单支付页面
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