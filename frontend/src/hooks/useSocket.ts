import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useTicketStore } from '../stores/ticketStore';
import { useSound } from './useSound';
import { Ticket, TicketStatus, SoundType } from '../types';

export function useSocket() {
  const { addTicket, updateTicketStatus, setConnected, activeStation } = useTicketStore();
  const { playSound } = useSound();

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setConnected(true);
      socket.emit('station:join', { stationId: activeStation });
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onOrderNew({ tickets }: { tickets: Ticket[] }) {
      tickets.forEach((t) => addTicket(t));
    }

    function onTicketStatusChanged({ ticketId, status, updatedAt }: {
      ticketId: string;
      status: TicketStatus;
      updatedAt: string;
    }) {
      updateTicketStatus(ticketId, status, updatedAt);
    }

    function onNotificationSound({ type }: { type: SoundType }) {
      playSound(type);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('order:new', onOrderNew);
    socket.on('ticket:status_changed', onTicketStatusChanged);
    socket.on('notification:sound', onNotificationSound);

    // If already connected, sync station
    if (socket.connected) {
      setConnected(true);
      socket.emit('station:join', { stationId: activeStation });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:new', onOrderNew);
      socket.off('ticket:status_changed', onTicketStatusChanged);
      socket.off('notification:sound', onNotificationSound);
    };
  }, [activeStation]);
}
