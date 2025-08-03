import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Copy, Check, Loader, Crown, Play, Settings } from 'lucide-react';
import MultiplayerManager from '../utils/multiplayer';

interface Room {
  id: string;
  name: string;
  host: string;
  players: string[];
  game: string;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: Date;
}

interface RoomSystemProps {
  onBack: () => void;
  username: string;
  onJoinGame: (roomId: string, game: string) => void;
}

const RoomSystem: React.FC<RoomSystemProps> = ({ onBack, username, onJoinGame }) => {
  const [currentView, setCurrentView] = useState<'menu' | 'create' | 'join' | 'room'>('menu');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedGame, setSelectedGame] = useState('CricketersAtlas');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [multiplayerManager] = useState(() => MultiplayerManager.getInstance());

  // Load rooms from localStorage and set up real-time updates
  useEffect(() => {
    // Initial load
    const rooms = multiplayerManager.getAllRooms();
    setRooms(rooms);
    
    // Listen for room updates
    const handleRoomsUpdate = (updatedRooms: Room[]) => {
      setRooms(updatedRooms);
    };

    const handleRoomUpdate = (updatedRoom: Room) => {
      setRooms(prev => prev.map(room => room.id === updatedRoom.id ? updatedRoom : room));
      
      // Update current room if we're in it
      if (currentRoom && currentRoom.id === updatedRoom.id) {
        setCurrentRoom(updatedRoom);
      }
    };

    multiplayerManager.on('rooms', handleRoomsUpdate);
    
    // Listen for specific room updates
    if (currentRoom) {
      multiplayerManager.on(`room:${currentRoom.id}`, handleRoomUpdate);
    }
    
    return () => {
      multiplayerManager.off('rooms', handleRoomsUpdate);
      if (currentRoom) {
        multiplayerManager.off(`room:${currentRoom.id}`, handleRoomUpdate);
      }
    };
  }, [multiplayerManager, currentRoom]);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) {
      setError('Please enter a room name');
      return;
    }

    setIsLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const roomData = {
      id: generateRoomId(),
      name: newRoomName.trim(),
      host: username,
      players: [username],
      game: selectedGame,
      status: 'waiting',
      maxPlayers,
      createdAt: new Date()
    };

    const newRoom = multiplayerManager.createRoom(roomData);
    setCurrentRoom(newRoom);
    setCurrentView('room');
    setIsLoading(false);
    setNewRoomName('');
  };

  const joinRoom = async (roomId: string) => {
    setIsLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const room = multiplayerManager.getRoom(roomId.toUpperCase());
    
    if (!room) {
      setError('Room not found');
      setIsLoading(false);
      return;
    }

    if (room.status === 'playing') {
      setError('Game is already in progress');
      setIsLoading(false);
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      setError('Room is full');
      setIsLoading(false);
      return;
    }

    if (room.players.includes(username)) {
      // If already in room, just join it
      setCurrentRoom(room);
      setCurrentView('room');
      setIsLoading(false);
      setRoomIdInput('');
      return;
    }

    const updatedRoom = multiplayerManager.joinRoom(roomId.toUpperCase(), username);
    if (!updatedRoom) {
      setError('Failed to join room');
      setIsLoading(false);
      return;
    }
    
    setCurrentRoom(updatedRoom);
    setCurrentView('room');
    setIsLoading(false);
    setRoomIdInput('');
  };

  const leaveRoom = () => {
    if (!currentRoom) return;

    multiplayerManager.leaveRoom(currentRoom.id, username);

    setCurrentRoom(null);
    setCurrentView('menu');
  };

  const startGame = () => {
    if (!currentRoom || currentRoom.host !== username) return;

    const updatedRoom = multiplayerManager.updateRoomStatus(currentRoom.id, 'playing');
    setCurrentRoom(updatedRoom);
    
    // Navigate to game with room context
    if (updatedRoom) {
      onJoinGame(currentRoom.id, currentRoom.game);
    }
  };

  const copyRoomId = async () => {
    if (!currentRoom) return;
    
    try {
      await navigator.clipboard.writeText(currentRoom.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentRoom.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (currentView === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-white/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 text-slate-600 hover:text-purple-600 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Games</span>
              </button>
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Multiplayer Rooms</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Join or Create a Room</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Create a private room for your friends or join an existing game using a room ID.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Create Room */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/20">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Settings className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Create Room</h3>
                <p className="text-slate-600">Start a new game room and invite friends</p>
              </div>
              
              <button
                onClick={() => setCurrentView('create')}
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create New Room
              </button>
            </div>

            {/* Join Room */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/20">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Join Room</h3>
                <p className="text-slate-600">Enter a room ID to join an existing game</p>
              </div>
              
              <button
                onClick={() => setCurrentView('join')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Join Existing Room
              </button>
            </div>
          </div>

          {/* Active Rooms */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Active Rooms</h3>
            </div>
            <div className="p-6">
              {rooms.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No active rooms at the moment</p>
                  <p className="text-sm text-slate-400">Create a room to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold">{room.name.charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{room.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span>Host: {room.host}</span>
                            <span>Players: {room.players.length}/{room.maxPlayers}</span>
                            <span>Game: {room.game}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              room.status === 'waiting' ? 'bg-orange-100 text-orange-800' :
                              room.status === 'playing' ? 'bg-purple-100 text-purple-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {room.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">{formatTimeAgo(room.createdAt)}</span>
                        <button
                          onClick={() => joinRoom(room.id)}
                          disabled={room.status === 'playing' || room.players.length >= room.maxPlayers || room.players.includes(username)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm"
                        >
                          {room.players.includes(username) ? 'Joined' : 
                           room.status === 'playing' ? 'Playing' :
                           room.players.length >= room.maxPlayers ? 'Full' : 'Join'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
        <header className="bg-white shadow-sm border-b border-green-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => setCurrentView('menu')}
                className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Rooms</span>
              </button>
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-green-600" />
                <h1 className="text-xl font-bold text-green-800">Create Room</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-green-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create New Room</h2>
              <p className="text-gray-600">Set up your game room and invite friends to join</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  id="roomName"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                  placeholder="Enter room name..."
                  maxLength={30}
                />
              </div>

              <div>
                <label htmlFor="game" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Game
                </label>
                <select
                  id="game"
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                >
                  <option value="CricketersAtlas">Cricketers Atlas</option>
                  <option value="SpyGame">Spy Game</option>
                  <option value="DumbCharades">Dumb Charades</option>
                  <option value="BollywoodQuiz" disabled>Bollywood Quiz (Coming Soon)</option>
                </select>
              </div>

              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Players
                </label>
                <select
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all duration-200"
                >
                  <option value={2}>2 Players</option>
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={5}>5 Players</option>
                  <option value={6}>6 Players</option>
                  <option value={8}>8 Players</option>
                  <option value={10}>10 Players</option>
                  <option value={15}>15 Players</option>
                  <option value={20}>20 Players</option>
                </select>
              </div>

              <button
                onClick={createRoom}
                disabled={isLoading || !newRoomName.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <span>Create Room</span>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'join') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <header className="bg-white shadow-sm border-b border-blue-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => setCurrentView('menu')}
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Rooms</span>
              </button>
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-blue-800">Join Room</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-blue-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Existing Room</h2>
              <p className="text-gray-600">Enter the room ID shared by your friend</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
                  Room ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-center text-lg font-mono tracking-wider"
                  placeholder="Enter Room ID..."
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">Room IDs are 6 characters long (e.g., ABC123)</p>
              </div>

              <button
                onClick={() => joinRoom(roomIdInput)}
                disabled={isLoading || !roomIdInput.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Joining Room...</span>
                  </>
                ) : (
                  <span>Join Room</span>
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (currentView === 'room' && currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <header className="bg-white shadow-sm border-b border-purple-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={leaveRoom}
                className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Leave Room</span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{currentRoom.name.charAt(0)}</span>
                </div>
                <h1 className="text-xl font-bold text-purple-800">{currentRoom.name}</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Room Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{currentRoom.name}</h2>
                    <p className="text-gray-600">Game: {currentRoom.game}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600">Room ID:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{currentRoom.id}</code>
                      <button
                        onClick={copyRoomId}
                        className="p-1 text-gray-500 hover:text-purple-600 transition-colors duration-200"
                        title="Copy Room ID"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">Share this ID with friends</p>
                  </div>
                </div>

                {currentRoom.status === 'waiting' && currentRoom.host === username && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-green-800">Ready to Start?</h3>
                        <p className="text-sm text-green-600">You can start the game when you're ready</p>
                      </div>
                      <button
                        onClick={startGame}
                        disabled={currentRoom.players.length < 2}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start Game</span>
                      </button>
                    </div>
                  </div>
                )}

                {currentRoom.status === 'playing' && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-800">Game in Progress</h3>
                        <p className="text-sm text-blue-600">The game has started!</p>
                      </div>
                      <button
                        onClick={() => onJoinGame(currentRoom.id, currentRoom.game)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        Join Game
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentRoom.players.map((player, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">{player.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{player}</span>
                          {player === currentRoom.host && (
                            <Crown className="w-4 h-4 text-yellow-500" title="Room Host" />
                          )}
                          {player === username && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">You</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {currentRoom.status === 'waiting' ? 'Ready to play' : 'In game'}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: currentRoom.maxPlayers - currentRoom.players.length }).map((_, index) => (
                    <div key={`empty-${index}`} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <span className="text-gray-500">Waiting for player...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Room Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Players:</span>
                    <span className="font-medium">{currentRoom.players.length}/{currentRoom.maxPlayers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Host:</span>
                    <span className="font-medium">{currentRoom.host}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Game:</span>
                    <span className="font-medium">{currentRoom.game}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      currentRoom.status === 'waiting' ? 'bg-green-100 text-green-800' :
                      currentRoom.status === 'playing' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {currentRoom.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatTimeAgo(currentRoom.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">How to Invite</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <p>1. Share the Room ID: <code className="bg-gray-100 px-1 rounded">{currentRoom.id}</code></p>
                  <p>2. Friends can join using "Join Room" option</p>
                  <p>3. Start the game when everyone is ready</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
};

export default RoomSystem;