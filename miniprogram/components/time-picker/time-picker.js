Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    selectedDate: {
      type: String,
      value: ''
    },
    selectedTime: {
      type: String,
      value: ''
    },
    availableSlots: {
      type: Array,
      value: []
    }
  },

  data: {
    viewYear: 0,
    viewMonth: 0,
    days: [],
    timeSlots: [],
    currentDate: ''
  },

  observers: {
    'visible': function(visible) {
      if (visible) {
        this.initCalendar();
        this.initTimeSlots();
      }
    }
  },

  lifetimes: {
    attached() {
      this.initCalendar();
      this.initTimeSlots();
    }
  },

  methods: {
    initCalendar() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      this.setData({
        viewYear: year,
        viewMonth: month
      });
      this.generateDays();
    },

    initTimeSlots() {
      const slots = [];
      for (let h = 9; h <= 20; h++) {
        const hour = h <= 12 ? h : h - 12;
        const ampm = h < 12 ? '上午' : '下午';
        const timeStr = `${h.toString().padStart(2, '0')}:00`;
        slots.push({
          time: timeStr,
          label: `${ampm} ${hour}:00`,
          available: true
        });
        const halfHour = `${h.toString().padStart(2, '0')}:30`;
        slots.push({
          time: halfHour,
          label: `${ampm} ${hour}:30`,
          available: true
        });
      }
      this.setData({ timeSlots: slots });
    },

    generateDays() {
      const { viewYear, viewMonth } = this.data;
      const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
      const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
      const today = new Date().toISOString().split('T')[0];

      const days = [];

      for (let i = 0; i < firstDay; i++) {
        days.push({ empty: true });
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const month = String(viewMonth).padStart(2, '0');
        const day = String(d).padStart(2, '0');
        const dateStr = `${viewYear}-${month}-${day}`;
        const isPast = dateStr < today;
        const isToday = dateStr === today;
        const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

        days.push({
          day: d,
          date: dateStr,
          disabled: isPast || isWeekend,
          today: isToday,
          weekend: isWeekend,
          selected: dateStr === this.data.selectedDate
        });
      }

      this.setData({ days });
    },

    onPrevMonth() {
      let { viewYear, viewMonth } = this.data;
      if (viewMonth === 1) {
        viewYear--;
        viewMonth = 12;
      } else {
        viewMonth--;
      }
      this.setData({ viewYear, viewMonth });
      this.generateDays();
    },

    onNextMonth() {
      let { viewYear, viewMonth } = this.data;
      if (viewMonth === 12) {
        viewYear++;
        viewMonth = 1;
      } else {
        viewMonth++;
      }
      this.setData({ viewYear, viewMonth });
      this.generateDays();
    },

    onDateSelect(e) {
      const { date } = e.currentTarget.dataset;
      if (!date || date.disabled) return;
      this.setData({ selectedDate: date });
      this.generateDays();
      this.triggerEvent('change', { date, time: this.data.selectedTime });
    },

    onTimeSelect(e) {
      const { time } = e.currentTarget.dataset;
      this.setData({ selectedTime: time });
      this.triggerEvent('change', { date: this.data.selectedDate, time });
    },

    onClose() {
      this.triggerEvent('close');
    },

    onConfirm() {
      if (!this.data.selectedDate || !this.data.selectedTime) {
        wx.showToast({ title: '请选择日期和时间', icon: 'none' });
        return;
      }
      this.triggerEvent('confirm', {
        date: this.data.selectedDate,
        time: this.data.selectedTime
      });
    }
  }
});