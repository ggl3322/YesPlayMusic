<template>
  <div class="binleng" @click="goBack">
    <img class="photo" :src="photo" alt="彬冷的心" draggable="false" />
  </div>
</template>

<script>
import photo from '@/assets/images/binleng.jpg';

export default {
  name: 'BinLeng',
  data() {
    return { photo };
  },
  methods: {
    goBack() {
      if (window.history.length > 1) this.$router.back();
      else this.$router.push({ name: 'library' });
    },
  },
};
</script>

<style lang="scss" scoped>
.binleng {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  cursor: pointer;
  animation: binleng-fade-in 0.5s ease;

  .photo {
    max-width: 100%;
    max-height: calc(100vh - 220px);
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    object-fit: contain;
    user-select: none;
  }
}

@keyframes binleng-fade-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
