// Simple cross-device multiplayer using a shared state system
interface Room {
  id: string;
  name: string;
  host: string;
  players: string[];
  game: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: string;
  lastUpdated: string;
}

interface GameState {
  roomId: string;
  currentPlayer?: string;
  gameData?: any;
  moves?: any[];
  lastUpdated: string;
}

class MultiplayerManager {
  private static instance: MultiplayerManager;
  private rooms: Map<string, Room> = new Map();
  private gameStates: Map<string, GameState> = new Map();
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): MultiplayerManager {
    if (!MultiplayerManager.instance) {
      MultiplayerManager.instance = new MultiplayerManager();
    }
    return MultiplayerManager.instance;
  }

  constructor() {
    this.loadFromStorage();
    this.startSync();
  }

  private loadFromStorage() {
    try {
      // Load rooms from localStorage
      const storedRooms = localStorage.getItem('addaGameRooms');
      if (storedRooms) {
        const roomsArray = JSON.parse(storedRooms);
        roomsArray.forEach((room: Room) => {
          this.rooms.set(room.id, room);
        });
      }

      // Load game states
      const storedGameStates = localStorage.getItem('addaGameStates');
      if (storedGameStates) {
        const gameStatesArray = JSON.parse(storedGameStates);
        gameStatesArray.forEach((state: GameState) => {
          this.gameStates.set(state.roomId, state);
        });
      }
    } catch (error) {
      console.error('Error loading multiplayer data:', error);
    }
  }

  private saveToStorage() {
    try {
      // Save rooms
      const roomsArray = Array.from(this.rooms.values());
      localStorage.setItem('addaGameRooms', JSON.stringify(roomsArray));

      // Save game states
      const gameStatesArray = Array.from(this.gameStates.values());
      localStorage.setItem('addaGameStates', JSON.stringify(gameStatesArray));

      // Also save to a shared key for cross-device sync
      const sharedData = {
        rooms: roomsArray,
        gameStates: gameStatesArray,
        lastSync: Date.now()
      };
      localStorage.setItem('addaMultiplayerSync', JSON.stringify(sharedData));
    } catch (error) {
      console.error('Error saving multiplayer data:', error);
    }
  }

  private startSync() {
    // Sync every 2 seconds
    this.syncInterval = setInterval(() => {
      this.syncWithOtherDevices();
    }, 2000);
  }

  private syncWithOtherDevices() {
    try {
      const sharedData = localStorage.getItem('addaMultiplayerSync');
      if (sharedData) {
        const data = JSON.parse(sharedData);
        
        // Update rooms
        data.rooms.forEach((room: Room) => {
          const existing = this.rooms.get(room.id);
          if (!existing || new Date(room.lastUpdated) > new Date(existing.lastUpdated)) {
            this.rooms.set(room.id, room);
            this.notifyListeners(`room:${room.id}`, room);
          }
        });

        // Update game states
        data.gameStates.forEach((state: GameState) => {
          const existing = this.gameStates.get(state.roomId);
          if (!existing || new Date(state.lastUpdated) > new Date(existing.lastUpdated)) {
            this.gameStates.set(state.roomId, state);
            this.notifyListeners(`game:${state.roomId}`, state);
          }
        });

        // Notify about rooms list update
        this.notifyListeners('rooms', Array.from(this.rooms.values()));
      }
    } catch (error) {
      console.error('Error syncing multiplayer data:', error);
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Room management
  createRoom(roomData: Omit<Room, 'lastUpdated'>): Room {
    const room: Room = {
      ...roomData,
      lastUpdated: new Date().toISOString()
    };
    this.rooms.set(room.id, room);
    this.saveToStorage();
    return room;
  }

  joinRoom(roomId: string, playerName: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    if (room.players.includes(playerName)) {
      return room; // Already in room
    }

    if (room.players.length >= room.maxPlayers) {
      return null; // Room full
    }

    const updatedRoom: Room = {
      ...room,
      players: [...room.players, playerName],
      lastUpdated: new Date().toISOString()
    };

    this.rooms.set(roomId, updatedRoom);
    this.saveToStorage();
    return updatedRoom;
  }

  leaveRoom(roomId: string, playerName: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const updatedPlayers = room.players.filter(p => p !== playerName);
    
    if (updatedPlayers.length === 0) {
      // Remove empty room
      this.rooms.delete(roomId);
      this.gameStates.delete(roomId);
      this.saveToStorage();
      return null;
    }

    const updatedRoom: Room = {
      ...room,
      players: updatedPlayers,
      host: room.host === playerName && updatedPlayers.length > 0 ? updatedPlayers[0] : room.host,
      lastUpdated: new Date().toISOString()
    };

    this.rooms.set(roomId, updatedRoom);
    this.saveToStorage();
    return updatedRoom;
  }

  updateRoomStatus(roomId: string, status: Room['status']): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const updatedRoom: Room = {
      ...room,
      status,
      lastUpdated: new Date().toISOString()
    };

    this.rooms.set(roomId, updatedRoom);
    this.saveToStorage();
    return updatedRoom;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null;
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  // Game state management
  updateGameState(roomId: string, gameData: any): void {
    const gameState: GameState = {
      roomId,
      gameData,
      lastUpdated: new Date().toISOString()
    };

    this.gameStates.set(roomId, gameState);
    this.saveToStorage();
  }

  getGameState(roomId: string): GameState | null {
    return this.gameStates.get(roomId) || null;
  }

  // Event listeners
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.listeners.clear();
  }
}

export default MultiplayerManager;