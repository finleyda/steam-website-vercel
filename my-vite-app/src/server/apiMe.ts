export interface CurrentUser {
  id: string
  name: string
  steamId: string
  profileUrl: string
  privacyNote: string
  avatarUrl: string
}

export interface SteamStats {
  totalGamesOwned: number
  totalHoursPlayed: number
  mostPlayedGame: string
  unplayedGames: number
  averageHoursPerGame: number
}

export interface SteamGame {
  appid: number
  name: string
  totalPlaytime: number
  recentPlaytime: number
}

export interface SteamAppDetails {
  appid: number
  name: string
  headerImage: string
  genres: string[]
  categories: string[]
  platforms: string[]
  price?: string
  releaseDate: string
}

export interface SteamPlayerCount {
  appid: number
  playerCount: number
}

export interface SteamFriend {
  steamId: string
  name: string
  avatarUrl: string
}

export interface SteamCompareResult {
  sharedGames: string[]
  userOnlyGames: string[]
  friendOnlyGames: string[]
}

export interface PlayerTogetherRecommendation {
  appid: number
  name: string
  reason: string
  score: number
  playerCount: number
  imageUrl: string
}

export function getCurrentUser(): CurrentUser {
  return {
    id: 'demo-user',
    name: 'Demo Steam User',
    steamId: '76561198000000000',
    profileUrl: 'https://steamcommunity.com/id/demo-user',
    privacyNote: 'Steam privacy settings may limit which profile details are visible.',
    avatarUrl: 'https://placehold.co/96x96/1b2838/66c0f4?text=Steam',
  }
}

export function getSteamStats(): SteamStats {
  return {
    totalGamesOwned: 128,
    totalHoursPlayed: 842,
    mostPlayedGame: 'Counter-Strike 2',
    unplayedGames: 24,
    averageHoursPerGame: 6.6,
  }
}

export function getSteamGames(): SteamGame[] {
  return [
    { appid: 730, name: 'Counter-Strike 2', totalPlaytime: 1840, recentPlaytime: 310 },
    { appid: 570, name: 'Dota 2', totalPlaytime: 1320, recentPlaytime: 98 },
    { appid: 620, name: 'Portal 2', totalPlaytime: 640, recentPlaytime: 24 },
    { appid: 1145360, name: 'Hades', totalPlaytime: 540, recentPlaytime: 180 },
    { appid: 1086940, name: 'Baldur\'s Gate 3', totalPlaytime: 420, recentPlaytime: 76 },
  ]
}

export function getSteamAppDetails(appid: string): SteamAppDetails {
  const numericAppId = Number(appid)

  const appDetails: Record<number, SteamAppDetails> = {
    730: {
      appid: 730,
      name: 'Counter-Strike 2',
      headerImage: 'https://placehold.co/800x320/1b2838/66c0f4?text=CS2',
      genres: ['Action', 'Free to Play'],
      categories: ['Multiplayer', 'Competitive'],
      platforms: ['Windows', 'Linux', 'macOS'],
      price: 'Free',
      releaseDate: 'Aug 21, 2012',
    },
    570: {
      appid: 570,
      name: 'Dota 2',
      headerImage: 'https://placehold.co/800x320/2a475e/ffffff?text=Dota+2',
      genres: ['MOBA', 'Strategy'],
      categories: ['Multiplayer', 'Online PvP'],
      platforms: ['Windows', 'Linux'],
      price: 'Free',
      releaseDate: 'Jul 9, 2013',
    },
    620: {
      appid: 620,
      name: 'Portal 2',
      headerImage: 'https://placehold.co/800x320/66c0f4/1b2838?text=Portal+2',
      genres: ['Puzzle', 'Adventure'],
      categories: ['Single-player', 'Co-op'],
      platforms: ['Windows', 'Linux', 'macOS'],
      price: '$9.99',
      releaseDate: 'Apr 19, 2011',
    },
    1145360: {
      appid: 1145360,
      name: 'Hades',
      headerImage: 'https://placehold.co/800x320/08111b/f5f5f5?text=Hades',
      genres: ['Action', 'Rogue-like'],
      categories: ['Single-player', 'Indie'],
      platforms: ['Windows', 'macOS', 'Linux'],
      price: '$24.99',
      releaseDate: 'Sep 17, 2020',
    },
    1086940: {
      appid: 1086940,
      name: 'Baldur\'s Gate 3',
      headerImage: 'https://placehold.co/800x320/5b6470/ffffff?text=Baldur%27s+Gate+3',
      genres: ['RPG', 'Adventure'],
      categories: ['Single-player', 'Co-op', 'Story Rich'],
      platforms: ['Windows', 'macOS', 'Linux'],
      price: '$59.99',
      releaseDate: 'Aug 3, 2023',
    },
  }

  return appDetails[numericAppId] ?? {
    appid: numericAppId,
    name: 'Unknown app',
    headerImage: 'https://placehold.co/800x320/1b2838/66c0f4?text=Steam',
    genres: ['Unavailable'],
    categories: ['Unavailable'],
    platforms: ['Unavailable'],
    releaseDate: 'Unavailable',
  }
}

export function getSteamPlayerCount(appid: string): SteamPlayerCount {
  const numericAppId = Number(appid)
  const playerCounts: Record<number, number> = {
    730: 1250000,
    570: 840000,
    620: 180000,
    1145360: 220000,
    1086940: 140000,
  }

  return {
    appid: numericAppId,
    playerCount: playerCounts[numericAppId] ?? 0,
  }
}

export function getSteamFriends(): SteamFriend[] {
  return [
    { steamId: 'friend-alex', name: 'Alex', avatarUrl: 'https://placehold.co/64x64/66c0f4/1b2838?text=A' },
    { steamId: 'friend-morgan', name: 'Morgan', avatarUrl: 'https://placehold.co/64x64/2a475e/ffffff?text=M' },
    { steamId: 'friend-jamie', name: 'Jamie', avatarUrl: 'https://placehold.co/64x64/1b2838/66c0f4?text=J' },
  ]
}

export function getSteamCompareResult(friendSteamId: string): SteamCompareResult {
  const sharedGames = ['Counter-Strike 2', 'Portal 2']
  const userOnlyGames = ['Hades', 'Baldur\'s Gate 3']
  const friendOnlyGames = friendSteamId === 'friend-alex'
    ? ['Team Fortress 2', 'Left 4 Dead 2']
    : friendSteamId === 'friend-morgan'
      ? ['Apex Legends', 'Among Us']
      : ['Rust', 'Destiny 2']

  return { sharedGames, userOnlyGames, friendOnlyGames }
}

export function getPlayerTogetherRecommendations(friendSteamId: string): PlayerTogetherRecommendation[] {
  const recommendationsByFriend: Record<string, PlayerTogetherRecommendation[]> = {
    'friend-alex': [
      {
        appid: 730,
        name: 'Counter-Strike 2',
        reason: 'You both play competitive multiplayer games',
        score: 95,
        playerCount: 1250000,
        imageUrl: 'https://placehold.co/120x60/1b2838/66c0f4?text=CS2',
      },
      {
        appid: 620,
        name: 'Portal 2',
        reason: 'You both enjoy co-op puzzle adventures',
        score: 88,
        playerCount: 180000,
        imageUrl: 'https://placehold.co/120x60/66c0f4/1b2838?text=Portal+2',
      },
    ],
    'friend-morgan': [
      {
        appid: 570,
        name: 'Dota 2',
        reason: 'You both enjoy team-based strategy games',
        score: 91,
        playerCount: 840000,
        imageUrl: 'https://placehold.co/120x60/2a475e/ffffff?text=Dota+2',
      },
      {
        appid: 1145360,
        name: 'Hades',
        reason: 'You both like fast-paced action titles',
        score: 84,
        playerCount: 220000,
        imageUrl: 'https://placehold.co/120x60/08111b/f5f5f5?text=Hades',
      },
    ],
    'friend-jamie': [
      {
        appid: 1086940,
        name: 'Baldur\'s Gate 3',
        reason: 'You both enjoy story-rich RPG experiences',
        score: 93,
        playerCount: 140000,
        imageUrl: 'https://placehold.co/120x60/5b6470/ffffff?text=Baldur%27s+Gate+3',
      },
      {
        appid: 730,
        name: 'Counter-Strike 2',
        reason: 'A great pick for an evening of multiplayer fun',
        score: 90,
        playerCount: 1250000,
        imageUrl: 'https://placehold.co/120x60/1b2838/66c0f4?text=CS2',
      },
    ],
  }

  return recommendationsByFriend[friendSteamId] ?? [
    {
      appid: 570,
      name: 'Dota 2',
      reason: 'A strong match for shared Steam habits',
      score: 89,
      playerCount: 840000,
      imageUrl: 'https://placehold.co/120x60/2a475e/ffffff?text=Dota+2',
    },
    {
      appid: 1145360,
      name: 'Hades',
      reason: 'A great option for a co-op gaming session',
      score: 86,
      playerCount: 220000,
      imageUrl: 'https://placehold.co/120x60/08111b/f5f5f5?text=Hades',
    },
  ]
}

export function createApiMeMiddleware() {
  return (req: any, res: any, next: () => void) => {
    if (req.method !== 'GET') {
      next()
      return
    }

    if (req.url === '/api/me') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getCurrentUser()))
      return
    }

    if (req.url === '/api/me/stats') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getSteamStats()))
      return
    }

    if (req.url === '/api/me/games') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getSteamGames()))
      return
    }

    if (req.url === '/api/me/friends') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getSteamFriends()))
      return
    }

    if (req.url.startsWith('/api/compare/')) {
      const friendSteamId = req.url.replace('/api/compare/', '')
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getSteamCompareResult(friendSteamId)))
      return
    }

    if (req.url.startsWith('/api/recommendations/player-together')) {
      const requestUrl = new URL(req.url, 'http://localhost')
      const friendSteamId = requestUrl.searchParams.get('friendSteamId') ?? ''
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getPlayerTogetherRecommendations(friendSteamId)))
      return
    }

    if (req.url.startsWith('/api/app/')) {
      const appid = req.url.replace('/api/app/', '')
      if (req.url.includes('/player-count')) {
        const playerCountAppId = req.url.replace('/api/app/', '').replace('/player-count', '')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(getSteamPlayerCount(playerCountAppId)))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(getSteamAppDetails(appid)))
      return
    }

    next()
  }
}
