import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (projectId: number) => void;
  leaveProject: (projectId: number) => void;
  emitTaskUpdate: (projectId: number, taskId: number, updates: any) => void;
  emitIssueUpdate: (projectId: number, issueId: number, updates: any) => void;
  emitMaterialAllocation: (projectId: number, materialId: number, quantity: number) => void;
  emitAttendanceUpdate: (projectId: number, labourId: number, hours: number) => void;
  emitDocumentUploaded: (projectId: number, documentId: number, fileName: string) => void;
  emitProjectStatusUpdate: (projectId: number, status: string) => void;
  sendNotification: (userId: number, message: string, type?: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      // Get socket URL based on environment
      const getSocketUrl = () => {
        const hostname = window.location.hostname;
        
        // Production HTTPS URLs
        if (hostname === 'www.constructease.hellbent.in') {
          return 'https://api.cms.hellbent.in';
        }
        
        // New production domain
        if (hostname === 'www.lminfra.hellbent.in') {
          return 'https://api.cms.hellbent.in';
        }
        
        // Production HTTP URLs (IP-based)
        if (hostname === '89.116.34.49') {
          return 'http://89.116.34.49:4041';
        }
        
        // Development URLs
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return process.env.REACT_APP_SOCKET_URL || 'http://localhost:4041';
        }
        
        // Default fallback
        return process.env.REACT_APP_SOCKET_URL || 'http://localhost:4041';
      };

      const newSocket = io(getSocketUrl(), {
        auth: {
          token: token
        }
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Socket connected');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Socket disconnected');
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error('Connection error');
      });

      // Listen for notifications
      newSocket.on('notification', (data) => {
        toast(data.message, {
          icon: data.type === 'error' ? '❌' : data.type === 'success' ? '✅' : 'ℹ️',
        });
      });

      // Listen for task updates
      newSocket.on('task_updated', (data) => {
        toast(`Task updated: ${data.updates.title || 'Task #' + data.taskId}`);
      });

      newSocket.on('task_assigned', (data) => {
        toast(`New task assigned to you`);
      });

      // Listen for issue updates
      newSocket.on('issue_updated', (data) => {
        toast(`Issue updated: ${data.updates.description?.substring(0, 50)}...`);
      });

      newSocket.on('issue_assigned', (data) => {
        toast(`New issue assigned to you`);
      });

      // Listen for material allocations
      newSocket.on('material_allocated', (data) => {
        toast(`Material allocated to project`);
      });

      // Listen for attendance updates
      newSocket.on('attendance_updated', (data) => {
        toast(`Attendance updated`);
      });

      // Listen for document uploads
      newSocket.on('document_uploaded', (data) => {
        toast(`New document uploaded: ${data.fileName}`);
      });

      // Listen for project status updates
      newSocket.on('project_status_changed', (data) => {
        toast(`Project status changed to: ${data.status}`);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [isAuthenticated, token]);

  const joinProject = (projectId: number) => {
    if (socket) {
      socket.emit('join_project', projectId);
    }
  };

  const leaveProject = (projectId: number) => {
    if (socket) {
      socket.emit('leave_project', projectId);
    }
  };

  const emitTaskUpdate = (projectId: number, taskId: number, updates: any) => {
    if (socket) {
      socket.emit('task_update', { projectId, taskId, updates });
    }
  };

  const emitIssueUpdate = (projectId: number, issueId: number, updates: any) => {
    if (socket) {
      socket.emit('issue_update', { projectId, issueId, updates });
    }
  };

  const emitMaterialAllocation = (projectId: number, materialId: number, quantity: number) => {
    if (socket) {
      socket.emit('material_allocation', { projectId, materialId, quantity });
    }
  };

  const emitAttendanceUpdate = (projectId: number, labourId: number, hours: number) => {
    if (socket) {
      socket.emit('attendance_update', { projectId, labourId, hours });
    }
  };

  const emitDocumentUploaded = (projectId: number, documentId: number, fileName: string) => {
    if (socket) {
      socket.emit('document_uploaded', { projectId, documentId, fileName });
    }
  };

  const emitProjectStatusUpdate = (projectId: number, status: string) => {
    if (socket) {
      socket.emit('project_status_update', { projectId, status });
    }
  };

  const sendNotification = (userId: number, message: string, type: string = 'info') => {
    if (socket) {
      socket.emit('send_notification', { userId, message, type });
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinProject,
    leaveProject,
    emitTaskUpdate,
    emitIssueUpdate,
    emitMaterialAllocation,
    emitAttendanceUpdate,
    emitDocumentUploaded,
    emitProjectStatusUpdate,
    sendNotification,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
