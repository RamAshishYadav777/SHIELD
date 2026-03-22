import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SocketState {
  isConnected: boolean;
  socketId: string | null;
}

const initialState: SocketState = {
  isConnected: false,
  socketId: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setSocketId: (state, action: PayloadAction<string | null>) => {
      state.socketId = action.payload;
    },
  },
});

export const { setConnected, setSocketId } = socketSlice.actions;
export default socketSlice.reducer;
