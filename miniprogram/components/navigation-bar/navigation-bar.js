Component({
  properties: {
    extClass: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: ''
    },
    color: {
      type: String,
      value: ''
    },
    back: {
      type: Boolean,
      value: true
    },
    homeButton: {
      type: Boolean,
      value: false
    },
    loading: {
      type: Boolean,
      value: false
    },
    animated: {
      type: Boolean,
      value: true
    },
    show: {
      type: Boolean,
      value: true
    },
    delta: {
      type: Number,
      value: 1
    }
  },

  data: {
    statusBarHeight: 0,
    navBarHeight: 44,
    menuButtonHeight: 32,
    menuButtonWidth: 87,
    menuButtonTop: 0,
    menuButtonRight: 0
  },

  lifetimes: {
    attached() {
      this.initSystemInfo();
    }
  },

  methods: {
    initSystemInfo() {
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 20;
      const platform = systemInfo.platform;

      let menuButtonHeight = 32;
      let menuButtonWidth = 87;
      let menuButtonTop = statusBarHeight + 4;
      let menuButtonRight = 7;

      try {
        const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
        if (menuButtonInfo) {
          menuButtonHeight = menuButtonInfo.height;
          menuButtonWidth = menuButtonInfo.width;
          menuButtonTop = menuButtonInfo.top;
          menuButtonRight = systemInfo.windowWidth - menuButtonInfo.right;
        }
      } catch (e) {
        // ignore
      }

      this.setData({
        statusBarHeight,
        menuButtonHeight,
        menuButtonWidth,
        menuButtonTop,
        menuButtonRight
      });
    },

    onBack() {
      this.triggerEvent('back', { delta: this.data.delta });
      if (this.data.delta > 0) {
        wx.navigateBack({
          delta: this.data.delta,
          fail: () => {
            wx.switchTab({ url: '/pages/index/index' });
          }
        });
      }
    },

    onHome() {
      wx.switchTab({ url: '/pages/index/index' });
    }
  }
});