<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CurrentUser, PlayerTogetherRecommendation, SteamAppDetails, SteamCompareResult, SteamFriend, SteamGame, SteamPlayerCount, SteamStats } from './server/apiMe'

const isSignedIn = ref(false)
const currentUser = ref<CurrentUser | null>(null)
const currentStats = ref<SteamStats | null>(null)
const games = ref<SteamGame[]>([])
const friends = ref<SteamFriend[]>([])
const comparison = ref<SteamCompareResult | null>(null)
const recommendations = ref<PlayerTogetherRecommendation[]>([])
const selectedFriendSteamId = ref('')
const selectedGame = ref<SteamGame | null>(null)
const selectedAppDetails = ref<SteamAppDetails | null>(null)
const selectedPlayerCount = ref<SteamPlayerCount | null>(null)
const loadingUser = ref(false)
const comparingFriend = ref(false)
const loadingRecommendations = ref(false)
const loadingAppDetails = ref(false)
const loadingPlayerCount = ref(false)
const errorMessage = ref('')
const gameSortKey = ref<'name' | 'totalPlaytime' | 'recentPlaytime'>('totalPlaytime')
const gameSortDirection = ref<'asc' | 'desc'>('desc')

type ApiSteamGame = {
  appid: number
  name: string
  playtime_forever?: number
  playtime_2weeks?: number
}

type ApiSteamProfile = {
  steamid: string
  personaname?: string
  profileurl?: string
  avatarfull?: string
  avatarmedium?: string
}

type ApiSteamFriend = {
  steamid: string
  profile?: ApiSteamProfile | null
}

type ApiSteamStats = {
  totalGames: number
  totalHours: number
  unplayedGames: number
  mostPlayedGame: ApiSteamGame | null
  averageHours: number
}

type ApiAppDetails = {
  app: {
    name?: string
    header_image?: string
    genres?: Array<{ description?: string }>
    categories?: Array<{ description?: string }>
    platforms?: Record<string, boolean>
    price_overview?: { final_formatted?: string }
    release_date?: { date?: string }
  }
}

type ApiCompareResult = {
  shared: Array<{ name: string }>
  onlyPrimary: Array<{ name: string }>
  onlyFriend: Array<{ name: string }>
}

type ApiRecommendation = {
  appid: number
  name: string
  reason: string
  recommendationScore: number
  playerCount: number | null
  headerImage: string | null
}

const quickStats = [
  { label: 'Profile status', value: 'Ready' },
  { label: 'Recent games', value: '12' },
  { label: 'Wishlist', value: '7' },
]

function normalizeCurrentUser(data: { steamid: string; profile: ApiSteamProfile | null }): CurrentUser {
  return {
    id: data.steamid,
    name: data.profile?.personaname || data.steamid,
    steamId: data.steamid,
    profileUrl: data.profile?.profileurl || `https://steamcommunity.com/profiles/${data.steamid}`,
    privacyNote: 'Steam privacy settings may limit which profile details are visible.',
    avatarUrl: data.profile?.avatarfull || data.profile?.avatarmedium || '',
  }
}

function normalizeStats(data: ApiSteamStats): SteamStats {
  return {
    totalGamesOwned: data.totalGames,
    totalHoursPlayed: data.totalHours,
    mostPlayedGame: data.mostPlayedGame?.name || 'Not available',
    unplayedGames: data.unplayedGames,
    averageHoursPerGame: data.averageHours,
  }
}

function normalizeGame(game: ApiSteamGame): SteamGame {
  return {
    appid: game.appid,
    name: game.name,
    totalPlaytime: game.playtime_forever || 0,
    recentPlaytime: game.playtime_2weeks || 0,
  }
}

function normalizeFriend(friend: ApiSteamFriend): SteamFriend {
  return {
    steamId: friend.steamid,
    name: friend.profile?.personaname || friend.steamid,
    avatarUrl: friend.profile?.avatarfull || friend.profile?.avatarmedium || '',
  }
}

function normalizeAppDetails(appid: number, data: ApiAppDetails): SteamAppDetails {
  const app = data.app
  return {
    appid,
    name: app.name || 'Unknown app',
    headerImage: app.header_image || '',
    genres: app.genres?.map((genre) => genre.description || '').filter(Boolean) || [],
    categories: app.categories?.map((category) => category.description || '').filter(Boolean) || [],
    platforms: Object.entries(app.platforms || {})
      .filter(([, supported]) => supported)
      .map(([platform]) => platform),
    price: app.price_overview?.final_formatted,
    releaseDate: app.release_date?.date || 'Unavailable',
  }
}

function normalizeComparison(data: ApiCompareResult): SteamCompareResult {
  return {
    sharedGames: data.shared.map((game) => game.name),
    userOnlyGames: data.onlyPrimary.map((game) => game.name),
    friendOnlyGames: data.onlyFriend.map((game) => game.name),
  }
}

function normalizeRecommendation(recommendation: ApiRecommendation): PlayerTogetherRecommendation {
  return {
    appid: recommendation.appid,
    name: recommendation.name,
    reason: recommendation.reason,
    score: recommendation.recommendationScore,
    playerCount: recommendation.playerCount || 0,
    imageUrl: recommendation.headerImage || '',
  }
}

function clearSignedInState(message = '') {
  currentUser.value = null
  currentStats.value = null
  games.value = []
  friends.value = []
  comparison.value = null
  recommendations.value = []
  selectedFriendSteamId.value = ''
  selectedGame.value = null
  selectedAppDetails.value = null
  selectedPlayerCount.value = null
  isSignedIn.value = false
  errorMessage.value = message
}

function formatPlaytime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function toggleSort(key: 'name' | 'totalPlaytime' | 'recentPlaytime') {
  if (gameSortKey.value === key) {
    gameSortDirection.value = gameSortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  gameSortKey.value = key
  gameSortDirection.value = 'asc'
}

const sortedGames = computed(() => {
  const list = [...games.value]

  list.sort((left, right) => {
    let comparison = 0

    if (gameSortKey.value === 'name') {
      comparison = left.name.localeCompare(right.name)
    } else if (gameSortKey.value === 'totalPlaytime') {
      comparison = left.totalPlaytime - right.totalPlaytime
    } else {
      comparison = left.recentPlaytime - right.recentPlaytime
    }

    return gameSortDirection.value === 'asc' ? comparison : -comparison
  })

  return list
})

async function loadCurrentUser() {
  loadingUser.value = true
  errorMessage.value = ''

  try {
    const [userResponse, statsResponse, gamesResponse, friendsResponse] = await Promise.all([
      fetch('/api/me', { credentials: 'include' }),
      fetch('/api/me/stats', { credentials: 'include' }),
      fetch('/api/me/games', { credentials: 'include' }),
      fetch('/api/me/friends', { credentials: 'include' }),
    ])

    if (userResponse.status === 401 || statsResponse.status === 401 || gamesResponse.status === 401 || friendsResponse.status === 401) {
      clearSignedInState('You are not signed in with Steam.')
      return
    }

    if (!userResponse.ok || !statsResponse.ok || !gamesResponse.ok || !friendsResponse.ok) {
      throw new Error('Unable to load your Steam profile data')
    }

    const userData = await userResponse.json()
    const statsData = await statsResponse.json()
    const gamesData = await gamesResponse.json()
    const friendsData = await friendsResponse.json()

    currentUser.value = normalizeCurrentUser(userData)
    currentStats.value = normalizeStats(statsData)
    games.value = (gamesData.games || []).map(normalizeGame)
    friends.value = (friendsData.friends || []).map(normalizeFriend)
    errorMessage.value = ''
    isSignedIn.value = true
  } catch (error) {
    clearSignedInState(error instanceof Error ? error.message : 'Unknown error')
  } finally {
    loadingUser.value = false
  }
}

async function openGameDetails(game: SteamGame) {
  closeFriendDetails()
  selectedGame.value = game
  selectedAppDetails.value = null
  selectedPlayerCount.value = null
  errorMessage.value = ''
  loadingAppDetails.value = true
  loadingPlayerCount.value = true

  try {
    const [detailsResponse, playerCountResponse] = await Promise.all([
      fetch(`/api/app/${game.appid}`, { credentials: 'include' }),
      fetch(`/api/app/${game.appid}/player-count`, { credentials: 'include' }),
    ])

    if (!detailsResponse.ok || !playerCountResponse.ok) {
      throw new Error('Unable to load app details')
    }

    selectedAppDetails.value = normalizeAppDetails(game.appid, await detailsResponse.json())
    selectedPlayerCount.value = await playerCountResponse.json()
    errorMessage.value = ''
  } catch (error) {
    selectedAppDetails.value = null
    selectedPlayerCount.value = null
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    loadingAppDetails.value = false
    loadingPlayerCount.value = false
  }
}

function closeGameDetails() {
  selectedGame.value = null
  selectedAppDetails.value = null
  selectedPlayerCount.value = null
  loadingAppDetails.value = false
  loadingPlayerCount.value = false
}

function closeFriendDetails() {
  selectedFriendSteamId.value = ''
  comparison.value = null
  recommendations.value = []
  comparingFriend.value = false
  loadingRecommendations.value = false
}

async function selectFriend(friendSteamId: string) {
  if (!friendSteamId) {
    comparison.value = null
    recommendations.value = []
    selectedFriendSteamId.value = ''
    return
  }

  closeGameDetails()
  errorMessage.value = ''
  comparingFriend.value = true
  loadingRecommendations.value = true
  selectedFriendSteamId.value = friendSteamId
  comparison.value = null
  recommendations.value = []

  try {
    const [comparisonResponse, recommendationsResponse] = await Promise.all([
      fetch(`/api/compare/${friendSteamId}`, { credentials: 'include' }),
      fetch(`/api/recommendations/play-together?friendSteamId=${encodeURIComponent(friendSteamId)}`, { credentials: 'include' }),
    ])

    if (!comparisonResponse.ok || !recommendationsResponse.ok) {
      throw new Error('Unable to compare your library with that friend')
    }

    const comparisonData = await comparisonResponse.json()
    const recommendationsData = await recommendationsResponse.json()

    comparison.value = normalizeComparison(comparisonData)
    recommendations.value = (recommendationsData.recommendations || []).map(normalizeRecommendation)
    errorMessage.value = ''
  } catch (error) {
    comparison.value = null
    recommendations.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Unknown error'
  } finally {
    comparingFriend.value = false
    loadingRecommendations.value = false
  }
}

onMounted(() => {
  void loadCurrentUser()
})
</script>

<template>
  <div class="layout">
    <header class="header">
      <div>
        <h1>Steam Checker</h1>
        <p>Discover your Steam activity at a glance</p>
      </div>
      <a v-if="isSignedIn" class="ghost-btn" href="#" @click.prevent="clearSignedInState()">
        Sign out
      </a>
      <a v-else class="ghost-btn" :href="'https://steam.tomthurston.dev/auth/steam'" target="_blank" rel="noopener noreferrer">
        Sign in
      </a>
    </header>

    <main class="dashboard">
      <section v-if="!isSignedIn" class="hero-card">
        <div class="hero-copy">
          <p class="eyebrow">Signed out</p>
          <h2>Turn your Steam profile into a polished dashboard</h2>
          <p>
            Welcome back to your personal Steam hub. Sign in to see account details,
            recent activity, and helpful highlights in one place.
          </p>
          <p class="note">
            Note: your Steam privacy settings may limit which profile details and activity data are visible here.
          </p>
        </div>

        <div class="preview-card">
          <h3>Dashboard preview</h3>
          <div v-for="item in quickStats" :key="item.label" class="stat-row">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section v-else class="dashboard-grid">
        <div class="content-box">
          <h3>Welcome back</h3>
          <div v-if="loadingUser" class="loading-state">
            <div class="spinner"></div>
            <p>Loading your profile…</p>
          </div>
          <div v-else-if="currentUser" class="profile-card">
            <div class="profile-summary">
              <img v-if="currentUser.avatarUrl" :src="currentUser.avatarUrl" :alt="`${currentUser.name} avatar`" class="avatar" />
              <div>
                <p class="profile-label">Steam name</p>
                <h4>{{ currentUser.name }}</h4>
                <p class="profile-subtext">{{ currentUser.steamId }}</p>
              </div>
            </div>
            <div class="profile-details">
              <p><strong>Profile:</strong> <a :href="currentUser.profileUrl" target="_blank" rel="noopener noreferrer">Open profile</a></p>
              <p><strong>Note:</strong> {{ currentUser.privacyNote }}</p>
            </div>
          </div>
          <div v-else-if="errorMessage" class="state-card state-card-error">
            <strong>We couldn’t load your profile</strong>
            <p>{{ errorMessage }}</p>
          </div>
          <div v-else class="state-card state-card-empty">
            <strong>No profile data yet</strong>
            <p>Sign in again or refresh to populate your Steam profile.</p>
          </div>
        </div>

        <div class="content-box">
          <h3>Library insights</h3>
          <div v-if="loadingUser" class="loading-state">
            <div class="spinner"></div>
            <p>Loading your stats…</p>
          </div>
          <div v-else-if="currentStats" class="stats-grid">
            <div class="stats-item">
              <span>Total games owned</span>
              <strong>{{ currentStats.totalGamesOwned }}</strong>
            </div>
            <div class="stats-item">
              <span>Total hours played</span>
              <strong>{{ currentStats.totalHoursPlayed }} hrs</strong>
            </div>
            <div class="stats-item">
              <span>Most played game</span>
              <strong>{{ currentStats.mostPlayedGame }}</strong>
            </div>
            <div class="stats-item">
              <span>Unplayed games</span>
              <strong>{{ currentStats.unplayedGames }}</strong>
            </div>
            <div class="stats-item">
              <span>Average hours / game</span>
              <strong>{{ currentStats.averageHoursPerGame.toFixed(1) }}</strong>
            </div>
          </div>
          <div v-else-if="errorMessage" class="state-card state-card-error">
            <strong>We couldn’t load your stats</strong>
            <p>{{ errorMessage }}</p>
          </div>
          <div v-else class="state-card state-card-empty">
            <strong>No stats available yet</strong>
            <p>Your Steam library stats will appear here once they’re available.</p>
          </div>
        </div>

        <div class="content-box games-card">
          <div class="card-header">
            <h3>Your games</h3>
            <p>Sortable library activity</p>
          </div>
          <div v-if="loadingUser" class="loading-state">
            <div class="spinner"></div>
            <p>Loading your games…</p>
          </div>
          <div v-else-if="sortedGames.length" class="table-wrapper">
            <table class="games-table">
              <thead>
                <tr>
                  <th>
                    <button class="sort-button" type="button" @click="toggleSort('name')">
                      Game name <span>{{ gameSortKey === 'name' ? (gameSortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
                    </button>
                  </th>
                  <th>
                    <button class="sort-button" type="button" @click="toggleSort('totalPlaytime')">
                      Total playtime <span>{{ gameSortKey === 'totalPlaytime' ? (gameSortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
                    </button>
                  </th>
                  <th>
                    <button class="sort-button" type="button" @click="toggleSort('recentPlaytime')">
                      Recent playtime <span>{{ gameSortKey === 'recentPlaytime' ? (gameSortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="game in sortedGames" :key="game.name" class="game-row" @click="openGameDetails(game)">
                  <td>{{ game.name }}</td>
                  <td>{{ formatPlaytime(game.totalPlaytime) }}</td>
                  <td>{{ formatPlaytime(game.recentPlaytime) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="errorMessage" class="state-card state-card-error">
            <strong>We couldn’t load your games</strong>
            <p>{{ errorMessage }}</p>
          </div>
          <div v-else class="state-card state-card-empty">
            <strong>No games found</strong>
            <p>Your Steam library is empty or private right now.</p>
          </div>
        </div>

        <div class="content-box">
          <div class="card-header">
            <h3>Friends</h3>
            <p>Select a friend to compare libraries</p>
          </div>
          <div v-if="loadingUser" class="loading-state">
            <div class="spinner"></div>
            <p>Loading your friends…</p>
          </div>
          <div v-else-if="friends.length" class="friends-list">
            <button
              v-for="friend in friends"
              :key="friend.steamId"
              class="friend-item friend-button"
              type="button"
              :class="{ active: selectedFriendSteamId === friend.steamId }"
              @click="selectFriend(friend.steamId)"
            >
              <img :src="friend.avatarUrl" :alt="`${friend.name} avatar`" class="friend-avatar" />
              <span>{{ friend.name }}</span>
            </button>
          </div>
          <div v-else-if="errorMessage" class="state-card state-card-error">
            <strong>We couldn’t load your friends</strong>
            <p>{{ errorMessage }}</p>
          </div>
          <div v-else class="state-card state-card-empty">
            <strong>You have no friends yet</strong>
            <p>Once your friends list is available, you can compare libraries here.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>Steam Website © 2026 — All rights reserved</p>
    </footer>

    <div v-if="selectedGame || selectedFriendSteamId" class="drawer-backdrop" @click="selectedGame ? closeGameDetails() : closeFriendDetails()"></div>

    <aside v-if="selectedGame" class="game-drawer">
      <div class="drawer-header">
        <div>
          <p class="eyebrow">Game details</p>
          <h3>{{ selectedGame.name }}</h3>
        </div>
        <button class="close-button" type="button" @click="closeGameDetails">×</button>
      </div>

      <div v-if="loadingAppDetails" class="loading-state drawer-loading">
        <div class="spinner"></div>
        <p>Loading app details…</p>
      </div>
      <div v-else-if="selectedAppDetails" class="drawer-content">
        <img :src="selectedAppDetails.headerImage" :alt="`${selectedAppDetails.name} header`" class="drawer-image" />
        <div class="detail-block">
          <strong>Genres</strong>
          <p>{{ selectedAppDetails.genres.join(', ') }}</p>
        </div>
        <div class="detail-block">
          <strong>Categories</strong>
          <p>{{ selectedAppDetails.categories.join(', ') }}</p>
        </div>
        <div class="detail-block">
          <strong>Platforms</strong>
          <p>{{ selectedAppDetails.platforms.join(', ') }}</p>
        </div>
        <div class="detail-block">
          <strong>Price</strong>
          <p>{{ selectedAppDetails.price || 'Not available' }}</p>
        </div>
        <div class="detail-block">
          <strong>Release date</strong>
          <p>{{ selectedAppDetails.releaseDate }}</p>
        </div>
        <div class="detail-block">
          <strong>Player count</strong>
          <p v-if="loadingPlayerCount">Loading player count…</p>
          <p v-else-if="selectedPlayerCount">{{ selectedPlayerCount.playerCount.toLocaleString() }}</p>
          <p v-else>Not available</p>
        </div>
      </div>
      <div v-else-if="errorMessage" class="state-card state-card-error">
        <strong>We couldn’t load this game</strong>
        <p>{{ errorMessage }}</p>
      </div>
      <div v-else class="state-card state-card-empty">
        <strong>No app details available</strong>
        <p>The selected game doesn’t have details available right now.</p>
      </div>
    </aside>

    <aside v-if="selectedFriendSteamId" class="friend-drawer">
      <div class="drawer-header">
        <div>
          <p class="eyebrow">Friend comparison</p>
          <h3>{{ friends.find((friend) => friend.steamId === selectedFriendSteamId)?.name || 'Friend' }}</h3>
        </div>
        <button class="close-button" type="button" @click="closeFriendDetails">×</button>
      </div>

      <div v-if="comparingFriend" class="loading-state drawer-loading">
        <div class="spinner"></div>
        <p>Comparing libraries…</p>
      </div>
      <div v-else-if="comparison" class="comparison-grid">
        <div>
          <h4>Shared games</h4>
          <ul>
            <li v-for="game in comparison.sharedGames" :key="game">{{ game }}</li>
          </ul>
        </div>
        <div>
          <h4>You only own</h4>
          <ul>
            <li v-for="game in comparison.userOnlyGames" :key="game">{{ game }}</li>
          </ul>
        </div>
        <div>
          <h4>Friend only</h4>
          <ul>
            <li v-for="game in comparison.friendOnlyGames" :key="game">{{ game }}</li>
          </ul>
        </div>
      </div>
      <div v-else-if="errorMessage" class="state-card state-card-error">
        <strong>We couldn’t compare your libraries</strong>
        <p>{{ errorMessage }}</p>
      </div>
      <div v-else class="state-card state-card-empty">
        <strong>No comparison data yet</strong>
        <p>Pick a friend to compare your libraries and get recommendations.</p>
      </div>

      <div class="recommendation-panel">
        <h4>Recommended shared games</h4>
        <div v-if="loadingRecommendations" class="loading-state">
          <div class="spinner"></div>
          <p>Loading recommendations…</p>
        </div>
        <div v-else-if="recommendations.length" class="recommendation-list">
          <div v-for="recommendation in recommendations" :key="recommendation.appid" class="recommendation-item">
            <img :src="recommendation.imageUrl" :alt="`${recommendation.name} artwork`" class="recommendation-image" />
            <div class="recommendation-content">
              <strong>{{ recommendation.name }}</strong>
              <p>{{ recommendation.reason }}</p>
              <div class="recommendation-meta">
                <span>Score: {{ recommendation.score }}/100</span>
                <span>Players: {{ recommendation.playerCount.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="errorMessage" class="state-card state-card-error">
          <strong>We couldn’t load recommendations</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <div v-else class="state-card state-card-empty">
          <strong>No recommendations available</strong>
          <p>There aren’t any shared-game suggestions right now.</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<style>
:root {
  --steam-dark: #171a21;
  --steam-darker: #1b2838;
  --steam-blue: #66c0f4;
  --steam-blue-dark: #2a475e;
  --steam-blue-bright: #8ed6ff;
  --steam-slate: #c7d5e0;
  --steam-muted: #8f98a0;
  --steam-surface: #1f2a37;
  --steam-surface-alt: #2a475e;
  --steam-panel: #223345;
  --steam-panel-alt: #2b3e50;
  --steam-border: #3b4c5f;
  --steam-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  --steam-text: #e6e6e6;
  --steam-text-muted: #a7b6c2;
  --steam-text-dark: #dce3ea;
  --steam-text-darker: #b7c3cd;
}

.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, sans-serif;
  background: linear-gradient(180deg, var(--steam-dark) 0%, var(--steam-darker) 100%);
  color: var(--steam-text);
}

body {
  margin: 0;
}

.header {
  background: linear-gradient(90deg, #1b2838 0%, #2a475e 50%, #1b2838 100%);
  color: #f5f5f5;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.header h1 {
  margin: 0 0 0.25rem;
}

.header p {
  margin: 0;
  opacity: 0.8;
}

.ghost-btn,
.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  background: transparent;
  color: #f5f5f5;
  border: 1px solid rgba(255,255,255,0.25);
}

.primary-btn {
  background: linear-gradient(180deg, var(--steam-blue-bright) 0%, var(--steam-blue) 100%);
  color: var(--steam-dark);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
}

.secondary-btn {
  background: linear-gradient(180deg, var(--steam-panel-alt) 0%, var(--steam-blue-dark) 100%);
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.header h1 {
  margin: 0 0 0.25rem;
}

.header p {
  margin: 0;
  opacity: 0.8;
}

.ghost-btn,
.primary-btn,
.secondary-btn {
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

.ghost-btn {
  background: transparent;
  color: white;
  border: 1px solid rgba(255,255,255,0.4);
}

.primary-btn {
  background: #66c0f4;
  color: #08111b;
}

.secondary-btn {
  background: #2a475e;
  color: white;
}

.dashboard {
  flex: 1;
  padding: 2rem;
  background: linear-gradient(180deg, var(--steam-dark) 0%, var(--steam-surface) 100%);
}

.hero-card {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1.5rem;
  align-items: center;
}

.hero-copy,
.preview-card,
.content-box {
  background: linear-gradient(180deg, var(--steam-panel) 0%, var(--steam-panel-alt) 100%);
  border-radius: 14px;
  padding: 1.5rem;
  box-shadow: var(--steam-shadow);
  border: 1px solid var(--steam-border);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--steam-blue-bright);
  font-weight: 700;
  font-size: 0.8rem;
}

.note {
  margin-top: 0.75rem;
  color: var(--steam-text-muted);
  font-size: 0.95rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 0.65rem 0;
  border-bottom: 1px solid #e6e6e6;
}

.stat-row:last-child {
  border-bottom: none;
}

.profile-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dfe3e8;
}

.profile-label {
  margin: 0 0 0.2rem;
  color: var(--steam-blue-bright);
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.profile-summary h4 {
  margin: 0;
}

.profile-subtext {
  margin: 0.2rem 0 0;
  color: var(--steam-text-muted);
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stats-grid {
  display: grid;
  gap: 0.75rem;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid #e6e6e6;
}

.stats-item:last-child {
  border-bottom: none;
}

.stats-item span {
  color: var(--steam-text-muted);
}

.games-card {
  grid-column: 1 / -1;
}

.card-header {
  margin-bottom: 1rem;
}

.card-header h3 {
  margin: 0 0 0.2rem;
}

.card-header p {
  margin: 0;
  color: var(--steam-text-muted);
}

.table-wrapper {
  overflow-x: auto;
}

.games-table {
  width: 100%;
  border-collapse: collapse;
}

.games-table th,
.games-table td {
  padding: 0.75rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--steam-border);
  color: var(--steam-text-darker);
}

.game-row {
  cursor: pointer;
}

.games-table th {
  font-size: 0.9rem;
}

.friends-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e6e6e6;
}

.friend-item:last-child {
  border-bottom: none;
}

.friend-button {
  width: 100%;
  justify-content: flex-start;
  background: transparent;
  border: none;
  padding: 0.75rem 0;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.friend-button.active {
  color: var(--steam-blue-bright);
  font-weight: 700;
}

.friend-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dfe3e8;
}

.sort-button {
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  cursor: pointer;
  color: var(--steam-text);
  font-weight: 700;
}

.sort-button span {
  margin-left: 0.25rem;
  color: var(--steam-blue-bright);
}

.comparison-panel {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e6e6e6;
}

.comparison-grid {
  display: grid;
  gap: 1rem;
}

.recommendation-panel {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e6e6e6;
}

.recommendation-panel h4 {
  margin: 0 0 0.75rem;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.recommendation-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--steam-border);
  border-radius: 10px;
  background: linear-gradient(90deg, #f8fbff 0%, #eef6fc 100%);
}

.recommendation-image {
  width: 120px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.recommendation-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.recommendation-content p {
  margin: 0;
  color: var(--steam-text-muted);
}

.recommendation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: var(--steam-text-darker);
}

.comparison-grid h4 {
  margin: 0 0 0.5rem;
}

.comparison-grid ul {
  margin: 0;
  padding-left: 1rem;
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 17, 27, 0.55);
  z-index: 20;
}

.game-drawer,
.friend-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(420px, 100%);
  height: 100vh;
  background: linear-gradient(180deg, var(--steam-panel) 0%, var(--steam-panel-alt) 100%);
  color: var(--steam-text);
  box-shadow: -8px 0 30px rgba(23, 26, 33, 0.18);
  z-index: 21;
  overflow-y: auto;
  padding: 1.5rem;
  border-left: 1px solid var(--steam-border);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.drawer-header h3 {
  margin: 0.25rem 0 0;
}

.close-button {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--steam-text);
}

.drawer-image {
  width: 100%;
  height: auto;
  border-radius: 10px;
  margin-bottom: 1rem;
}

.detail-block {
  margin-bottom: 0.9rem;
}

.detail-block strong {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--steam-blue-bright);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--steam-border);
  background: rgba(255, 255, 255, 0.04);
}

.loading-state p {
  margin: 0;
  color: var(--steam-text-muted);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(102, 192, 244, 0.25);
  border-top-color: var(--steam-blue-bright);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.drawer-loading {
  justify-content: flex-start;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.state-card {
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--steam-border);
  background: rgba(255, 255, 255, 0.04);
}

.state-card strong {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--steam-blue-bright);
}

.state-card p {
  margin: 0;
  color: var(--steam-text-muted);
}

.state-card-error {
  border-color: rgba(255, 120, 120, 0.35);
  background: rgba(120, 40, 40, 0.15);
}

.state-card-empty {
  border-color: rgba(102, 192, 244, 0.25);
  background: rgba(102, 192, 244, 0.08);
}

.detail-block p {
  margin: 0;
  color: var(--steam-text-muted);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

ul {
  margin: 0.5rem 0 0 1rem;
  padding: 0;
}

.footer {
  background: linear-gradient(90deg, var(--steam-dark) 0%, var(--steam-darker) 100%);
  color: var(--steam-slate);
  padding: 1rem;
  text-align: center;
}

@media (max-width: 800px) {
  .hero-card,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

