// components/empty-state/empty-state.ts
Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    icon: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: '暂无数据'
    },
    desc: {
      type: String,
      value: ''
    },
    showBtn: {
      type: Boolean,
      value: false
    },
    btnText: {
      type: String,
      value: '去操作'
    }
  },
  
  methods: {
    onBtnTap() {
      this.triggerEvent('btntap')
    }
  }
})
