// pages/cart/cart.js
Page({
  data: {
    cartItems: [
      {
        id: 1,
        name: '芭乐布蕾',
        spec: '5英寸 · 0.5磅',
        price: '298',
        quantity: 1,
        checked: false,
        image: '/image/goods/商品_01.png'
      },
      {
        id: 2,
        name: '蓝莓多多',
        spec: '5英寸 · 0.5磅',
        price: '328',
        quantity: 1,
        checked: false,
        image: '/image/goods/商品_02.png'
      }
    ],
    recommendItems: [
      { id: 1, name: '生日快乐眼镜', price: '68', image: '/image/goods/商品_05.png' },
      { id: 2, name: '小猪举牌', price: '48', image: '/image/goods/商品_06.png' },
      { id: 3, name: '蛋糕插件', price: '38', image: '/image/goods/商品_07.png' },
      { id: 4, name: '装饰蜡烛', price: '28', image: '/image/goods/商品_08.png' }
    ],
    allChecked: false,
    totalPrice: '0',
    selectedCount: 0
  },

  onLoad: function() {
    this.calculateTotal();
  },

  toggleCheck: function(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.cartItems.map(item => {
      if (item.id === id) {
        item.checked = !item.checked;
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.calculateTotal();
  },

  toggleAllCheck: function() {
    const allChecked = !this.data.allChecked;
    const items = this.data.cartItems.map(item => {
      item.checked = allChecked;
      return item;
    });
    this.setData({ cartItems: items, allChecked });
    this.calculateTotal();
  },

  decrease: function(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.cartItems.map(item => {
      if (item.id === id && item.quantity > 1) {
        item.quantity -= 1;
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.calculateTotal();
  },

  increase: function(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.cartItems.map(item => {
      if (item.id === id) {
        item.quantity += 1;
      }
      return item;
    });
    this.setData({ cartItems: items });
    this.calculateTotal();
  },

  calculateTotal: function() {
    let total = 0;
    let count = 0;
    this.data.cartItems.forEach(item => {
      if (item.checked) {
        total += parseInt(item.price) * item.quantity;
        count += item.quantity;
      }
    });
    this.setData({
      totalPrice: total.toString(),
      selectedCount: count
    });
  }
});