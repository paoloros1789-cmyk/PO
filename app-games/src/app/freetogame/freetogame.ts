import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FreetoGameService, Game } from './freetogame.service';

interface TestResult {
  name: string;
  passed: boolean;
  expected?: number;
  got?: any;
  details?: string;
}

const SAMPLE_MOCK_GAMES: Game[] = [
  {
    id: 1,
    title: 'Mock MMORPG',
    short_description: 'Un gioco di prova MMORPG',
    thumbnail: 'https://via.placeholder.com/400x225.png?text=Mock+MMO',
    platform: 'PC',
    genre: 'mmorpg',
    release_date: '2022-01-01',
    publisher: 'Mock Studio',
    game_url: '#',
    videos: [
      {
        id: 1,
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnail: 'https://via.placeholder.com/400x225.png?text=Video+1',
      },
    ],
  },
  {
    id: 2,
    title: 'Mock Shooter',
    short_description: 'Un gioco di prova Shooter',
    thumbnail: 'https://via.placeholder.com/400x225.png?text=Mock+Shooter',
    platform: 'Browser',
    genre: 'shooter',
    release_date: '2021-05-10',
    publisher: 'Mock Labs',
    game_url: '#',
    videos: [
      {
        id: 1,
        video_url: 'https://www.w3schools.com/html/movie.mp4',
        thumbnail: 'https://via.placeholder.com/400x225.png?text=Video+2',
      },
    ],
  },
];

@Component({
  selector: 'app-freetogame-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './freetogame.html',
  styleUrls: ['./freetogame.css'],
})
export class FreetoGameExplorerComponent implements OnInit, OnDestroy {
  platform = 'all';
  category = '';
  sortBy = '';
  searchTitle = '';

  games: Game[] = [];
  filteredGames: Game[] = [];
  loading = false;
  error: string | null = null;
  
  // Track which game is being hovered
  hoveredGameId: number | null = null;

  // Available platforms
  platforms = [
    { value: 'all', label: 'All', icon: '🎮' },
    { value: 'pc', label: 'PC', icon: '🖥️' },
  ];

  // Available categories for dropdown
  categories = [
    { value: '', label: 'All Categories' },
    { value: 'mmorpg', label: 'MMORPG' },
    { value: 'shooter', label: 'Shooter' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'moba', label: 'MOBA' },
    { value: 'card-games', label: 'Card Games' },
    { value: 'racing', label: 'Racing' },
    { value: 'sports', label: 'Sports' },
    { value: 'social', label: 'Social' },
    { value: 'sandbox', label: 'Sandbox' },
    { value: 'open-world', label: 'Open World' },
    { value: 'survival', label: 'Survival' },
    { value: 'pvp', label: 'PvP' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'sci-fi', label: 'Sci-Fi' },
  ];

  mockMode = false;

  testOutput: TestResult[] = [];

  private abortController: AbortController | null = null;

  constructor(private gameService: FreetoGameService) {}

  ngOnInit(): void {
    // Initial load
    this.fetchGames();
  }

  ngOnDestroy(): void {
    // Cleanup
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  async fetchGames(forceMock = false): Promise<Game[] | null> {
    // If forced mock OR global mockMode, return mock data
    if (forceMock || this.mockMode) {
      this.error = null;
      this.games = SAMPLE_MOCK_GAMES;
      this.updateFilteredGames();
      return SAMPLE_MOCK_GAMES;
    }

    // Abort previous
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch (e) {
        // ignore
      }
    }
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.loading = true;
    this.error = null;

    try {
      const data = await this.gameService.fetchGames(
        this.platform,
        this.category,
        this.sortBy
      );
      this.games = Array.isArray(data) ? data : [];
      this.updateFilteredGames();
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') return null;

      console.error('Fetch error:', err);
      this.error = err.message || 'Errore sconosciuto durante il caricamento dei giochi.';
      this.games = [];
      this.filteredGames = [];
      return null;
    } finally {
      this.loading = false;
    }
  }

  onPlatformChange(): void {
    this.fetchGames();
  }

  onCategoryChange(): void {
    this.fetchGames();
  }

  onSortByChange(): void {
    this.fetchGames();
  }

  onLoadGamesClick(): void {
    this.fetchGames();
  }

  onResetClick(): void {
    this.platform = 'all';
    this.category = '';
    this.sortBy = '';
    this.searchTitle = '';
    this.error = null;
    this.games = [];
    this.filteredGames = [];
  }

  async runTests(): Promise<void> {
    const results: TestResult[] = [];

    // Test 1: forceMock true returns SAMPLE_MOCK_GAMES immediately
    try {
      const data = await this.fetchGames(true);
      const passed = Array.isArray(data) && data.length === SAMPLE_MOCK_GAMES.length;
      results.push({
        name: 'Mock mode returns sample data',
        passed,
        expected: SAMPLE_MOCK_GAMES.length,
        got: Array.isArray(data) ? data.length : typeof data,
      });
    } catch (e) {
      results.push({
        name: 'Mock mode returns sample data',
        passed: false,
        details: String(e),
      });
    }

    // Test 2: network fetch attempt using proxy (if proxy is enabled or available)
    try {
      const data = await this.gameService.fetchGames();
      results.push({
        name: 'Network fetch with proxy fallback',
        passed: data !== null,
        details: data ? `Got ${Array.isArray(data) ? data.length : 'non-array'} items` : 'null response',
      });
    } catch (e) {
      results.push({
        name: 'Network fetch with proxy fallback',
        passed: false,
        details: String(e),
      });
    }

    this.testOutput = results;
  }

  clearTests(): void {
    this.testOutput = [];
  }

  filterGamesByTitle(gamesToFilter: Game[]): Game[] {
    if (!this.searchTitle.trim()) {
      return gamesToFilter;
    }
    const searchLower = this.searchTitle.toLowerCase();
    return gamesToFilter.filter((game) =>
      game.title.toLowerCase().includes(searchLower)
    );
  }

  updateFilteredGames(): void {
    this.filteredGames = this.filterGamesByTitle(this.games);
  }

  onSearchChange(): void {
    this.updateFilteredGames();
  }

  getGameUrl(game: Game): string {
    return game.game_url || game.url || '#';
  }

  getGameVideoUrl(game: Game): string | null {
    // Prova a ottenere l'URL del video dai dati dell'API
    if (game.videos && game.videos.length > 0) {
      return game.videos[0].video_url;
    }
    return null;
  }
}
