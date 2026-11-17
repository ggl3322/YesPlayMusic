<template>
  <div v-show="show" ref="library">
    <h1>
      <img
        class="avatar"
        :src="data.user.avatarUrl | resizeImage"
        loading="lazy"
      />{{ data.user.nickname }}{{ $t('library.sLibrary') }}
    </h1>
    <div class="section-one">
      <div class="liked-songs" @click="goToLikedSongsList">
        <div class="bottom">
          <div class="titles">
            <div class="title">{{ $t('library.likedSongs') }}</div>
            <div class="sub-title">
              {{ liked.songs.length }}{{ $t('common.songs') }}
            </div>
          </div>
          <button @click.stop="openPlayModeTabMenu">
            <svg-icon icon-class="play" />
          </button>
        </div>
      </div>
      <div class="songs">
        <TrackList
          :id="liked.playlists.length > 0 ? liked.playlists[0].id : 0"
          :tracks="liked.songsWithDetails"
          :column-number="3"
          type="tracklist"
          dbclick-track-func="playPlaylistByID"
        />
      </div>
    </div>
    <div class="section-two">
      <div class="tabs-row">
        <div class="tabs">
          <div
            class="tab dropdown"
            :class="{ active: currentTab === 'playlists' }"
            @click="updateCurrentTab('playlists')"
          >
            <span class="text">{{
              {
                all: $t('contextMenu.allPlaylists'),
                mine: $t('contextMenu.minePlaylists'),
                liked: $t('contextMenu.likedPlaylists'),
              }[playlistFilter]
            }}</span>
            <span class="icon" @click.stop="openPlaylistTabMenu"
              ><svg-icon icon-class="dropdown"
            /></span>
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'albums' }"
            @click="updateCurrentTab('albums')"
          >
            {{ $t('library.albums') }}
          </div>
          <div
            class="tab"
            :class="{ active: currentTab === 'artists' }"
            @click="updateCurrentTab('artists')"
          >
            {{ $t('library.artists') }}
          </div>
        </div>
        <button
          v-show="currentTab === 'playlists'"
          class="tab-button"
          @click="openAddPlaylistDialog"
        >
          <svg-icon icon-class="plus" /> {{ $t('library.newPlaylist') }}
        </button>
      </div>

      <div v-show="currentTab === 'playlists'">
        <CoverRow
          :items="filteredPlaylists"
          type="playlist"
          :show-play-button="true"
        />
      </div>
      <div v-show="currentTab === 'albums'">
        <CoverRow
          :items="liked.albums"
          type="album"
          :show-play-button="true"
        />
      </div>
      <div v-show="currentTab === 'artists'">
        <CoverRow :items="liked.artists" type="artist" :show-play-button="true" />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import { isAccountLoggedIn } from '@/utils/auth';
import { getLikedSongsWithDetails } from '@/utils/data';

import TrackList from '@/components/TrackList.vue';
import CoverRow from '@/components/CoverRow.vue';

export default {
  name: 'Library',
  components: {
    TrackList,
    CoverRow,
  },
  data() {
    return {
      show: false,
      currentTab: 'playlists',
      playlistFilter: 'all',
    };
  },
  computed: {
    ...mapState(['liked', 'data']),
    filteredPlaylists() {
      return this.liked.playlists.filter(p => {
        if (this.playlistFilter === 'all') return true;
        if (this.playlistFilter === 'mine')
          return p.creator.userId === this.data.user.id;
        if (this.playlistFilter === 'liked')
          return p.creator.userId !== this.data.user.id;
        return true;
      });
    },
  },
  created() {
    if (!isAccountLoggedIn()) {
      this.$router.push({ path: '/login' });
      return;
    }
  },
  activated() {
    this.show = true;
    this.loadData();
  },
  methods: {
    ...mapActions(['showToast']),
    loadData() {
      getLikedSongsWithDetails();
    },
    goToLikedSongsList() {
      this.$router.push({
        path: '/playlist/' + this.liked.playlists[0].id,
      });
    },
    updateCurrentTab(tab) {
      this.currentTab = tab;
    },
    openAddPlaylistDialog() {
      this.$store.commit('updateAddPlaylistDialog', true);
    },
    openPlayModeTabMenu(e) {
      this.$store.commit('openContextMenu', {
        event: e,
        menu: [
          {
            label: this.$t('contextMenu.play'),
            click: () => {
              this.$store.dispatch('playLikedSongs');
            },
          },
          {
            label: this.$t('contextMenu.cardiacMode'),
            click: () => {
              this.$store.dispatch('cardiacMode');
            },
          },
        ],
      });
    },
    openPlaylistTabMenu(e) {
      this.$store.commit('openContextMenu', {
        event: e,
        menu: [
          {
            label: this.$t('contextMenu.allPlaylists'),
            click: () => {
              this.playlistFilter = 'all';
            },
          },
          {
            label: this.$t('contextMenu.minePlaylists'),
            click: () => {
              this.playlistFilter = 'mine';
            },
          },
          {
            label: this.$t('contextMenu.likedPlaylists'),
            click: () => {
              this.playlistFilter = 'liked';
            },
          },
        ],
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.section-one {
  display: flex;
  gap: 12px;
  .liked-songs {
    flex: 3;
    width: 100%;
    height: 180px;
    padding: 18px;
    border-radius: 16px;
    color: #fff;
    background-image: linear-gradient(
      120deg,
      #5c7cfa 0%,
      #335eea 55%,
      #2b4fd8 100%
    );
    display: flex;
    flex-direction: column;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(51, 94, 234, 0.25);
  }
  .bottom {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    .titles {
      flex: 1;
      min-width: 0;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      line-height: 24px;
      margin-bottom: 8px;
    }
    .sub-title {
      font-size: 13px;
      opacity: 0.8;
    }
    button {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      margin-left: auto;
      margin-bottom: 2px;
      background-color: #335eea;
      border: none;
      border-radius: 50%;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35);
      cursor: pointer;
      transition: 0.2s;
      &:hover {
        transform: scale(1.08);
        background-color: #4067f5;
      }
      &:active {
        transform: scale(0.92);
      }
      .svg-icon {
        width: 22px;
        height: 22px;
        color: #fff;
        margin-left: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
  .songs {
    flex: 7;
    height: 180px;
    overflow-y: hidden;
    .track-list-item {
      cursor: pointer;
      .cover {
        width: 40px;
        height: 40px;
        margin-right: 12px;
      }
      .name {
        font-size: 14px;
        font-weight: 600;
      }
      .ar {
        font-size: 12px;
        opacity: 0.6;
      }
    }
  }
}
</style>
