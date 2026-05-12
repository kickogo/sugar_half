Component({
  properties: {
    specs: {
      type: Array,
      value: []
    },
    selectedSpecs: {
      type: Object,
      value: {}
    },
    skus: {
      type: Array,
      value: []
    },
    visible: {
      type: Boolean,
      value: false
    }
  },

  data: {
    processedSpecs: []
  },

  observers: {
    'specs, skus': function(specs, skus) {
      this.processSpecs();
    },
    'selectedSpecs': function(selectedSpecs) {
      this.processSpecs();
    }
  },

  lifetimes: {
    attached() {
      this.processSpecs();
    }
  },

  methods: {
    processSpecs() {
      const { specs, selectedSpecs, skus } = this.data;
      if (!specs || specs.length === 0) return;

      const processed = specs.map(spec => {
        const options = spec.options.map(opt => {
          const isSelected = selectedSpecs[spec.name] === opt.value;
          const available = this.checkAvailability(spec.name, opt.value, selectedSpecs);
          return {
            ...opt,
            selected: isSelected,
            available
          };
        });
        return {
          name: spec.name,
          options
        };
      });

      this.setData({ processedSpecs: processed });
      this.updateSelectedSku();
    },

    checkAvailability(specName, value, currentSelected) {
      const { skus } = this.data;
      const testSelected = { ...currentSelected, [specName]: value };

      return skus.some(sku => {
        const skuSpecs = JSON.parse(sku.specs || '{}');
        // Check if all currently selected specs match the SKU
        const allMatch = Object.keys(currentSelected).every(key =>
          skuSpecs[key] === currentSelected[key]
        );
        // Check if the new spec value matches the SKU
        const newMatch = skuSpecs[specName] === value;
        return allMatch && newMatch;
      });
    },

    updateSelectedSku() {
      const { processedSpecs, skus } = this.data;
      const selectedSpecs = {};
      processedSpecs.forEach(spec => {
        const selected = spec.options.find(o => o.selected);
        if (selected) {
          selectedSpecs[spec.name] = selected.value;
        }
      });

      const matchedSku = skus.find(sku => {
        const skuSpecs = JSON.parse(sku.specs || '{}');
        return Object.keys(selectedSpecs).every(key => skuSpecs[key] === selectedSpecs[key]);
      });

      if (matchedSku) {
        this.triggerEvent('skuChange', {
          sku: matchedSku,
          selectedSpecs
        });
      }
    },

    onSpecTap(e) {
      const { specname, value } = e.currentTarget.dataset;
      const newSelectedSpecs = { ...this.data.selectedSpecs, [specname]: value };

      this.triggerEvent('change', {
        selectedSpecs: newSelectedSpecs
      });
    },

    onClose() {
      this.triggerEvent('close');
    },

    onConfirm() {
      const { processedSpecs } = this.data;
      const selectedSpecs = {};
      processedSpecs.forEach(spec => {
        const selected = spec.options.find(o => o.selected);
        if (selected) {
          selectedSpecs[spec.name] = selected.value;
        }
      });

      const matchedSku = this.data.skus.find(sku => {
        const skuSpecs = JSON.parse(sku.specs || '{}');
        return Object.keys(selectedSpecs).every(key => skuSpecs[key] === selectedSpecs[key]);
      });

      this.triggerEvent('confirm', {
        sku: matchedSku,
        selectedSpecs
      });
    }
  }
});