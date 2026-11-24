<template>
  <div class="binleng" @click="goBack">
    <img class="photo" :src="photo" alt="彬冷的心" draggable="false" />
  </div>
</template>

<script>
import { mapState } from 'vuex';
import photo from '@/assets/images/binleng.jpg';

// 这一页固定播放的曲目：777 WOES - 皇昶枢（MULA SAKEE）
const FIXED_TRACK_ID = 1500167452;

export default {
  name: 'BinLeng',
  data() {
    return { photo };
  },
  computed: {
    ...mapState(['player']),
  },
  mounted() {
    this.startFixedTrack();
  },
  beforeDestroy() {
    // 离开时把循环模式还原，不影响其他页面的播放习惯
    if (this.previousRepeatMode !== undefined) {
      this.player.repeatMode = this.previousRepeatMode;
    }
  },
  methods: {
    startFixedTrack() {
      const player = this.player;
      this.previousRepeatMode = player.repeatMode;
      player.repeatMode = 'one';

      if (player.currentTrackID === FIXED_TRACK_ID) {
        // 已经是这首（比如刚从这个页面离开又回来），只负责继续播放
        if (!player.playing) player.play();
        return;
      }

      player.replacePlaylist(
        [FIXED_TRACK_ID],
        FIXED_TRACK_ID,
        'playlist',
        FIXED_TRACK_ID
      );
    },
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
