import api from './apiClient';

/**
 * Team Service
 * Handles all team-related API calls
 */

export const teamService = {
  /**
   * Get all available games
   */
  getGames: async () => {
    try {
      return await api.get('/api/teams/games');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get current user's teams
   */
  getMyTeams: async () => {
    try {
      return await api.get('/api/teams/my');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get team by ID
   */
  getTeamById: async (teamId) => {
    try {
      return await api.get(`/api/teams/${teamId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new team
   * @param {Object} teamData - Team data (name, game, rank, server, description)
   * @param {File} logoFile - Optional team logo file
   */
  createTeam: async (teamData, logoFile = null) => {
    try {
      const formData = new FormData();
      formData.append('name', teamData.name);
      formData.append('game', teamData.game);
      formData.append('rank', teamData.rank);
      formData.append('server', teamData.server);
      
      if (teamData.description) {
        formData.append('description', teamData.description);
      }
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      return await api.post('/api/teams/create', formData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update team
   */
  updateTeam: async (teamId, teamData, logoFile = null) => {
    try {
      const formData = new FormData();
      
      if (teamData.name) formData.append('name', teamData.name);
      if (teamData.game) formData.append('game', teamData.game);
      if (teamData.rank) formData.append('rank', teamData.rank);
      if (teamData.server) formData.append('server', teamData.server);
      if (teamData.description !== undefined) {
        formData.append('description', teamData.description);
      }
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      return await api.put(`/api/teams/${teamId}`, formData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update team logo
   */
  updateTeamLogo: async (teamId, logoFile) => {
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      return await api.put(`/api/teams/${teamId}/logo`, formData);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete team logo
   */
  deleteTeamLogo: async (teamId) => {
    try {
      return await api.delete(`/api/teams/${teamId}/logo`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete team
   */
  deleteTeam: async (teamId) => {
    try {
      return await api.delete(`/api/teams/${teamId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Join team by code
   */
  joinTeamByCode: async (teamCode) => {
    try {
      return await api.post('/api/teams/join', { teamCode });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Join team by ID with code
   */
  joinTeamById: async (teamId, code) => {
    try {
      return await api.post(`/api/teams/${teamId}/join`, { code });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Leave team
   */
  leaveTeam: async (teamId) => {
    try {
      return await api.delete(`/api/teams/${teamId}/members/self`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update member role
   */
  updateMemberRole: async (teamId, memberId, role) => {
    try {
      return await api.put(`/api/teams/${teamId}/members/${memberId}/role`, {
        role,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update member rank
   */
  updateMemberRank: async (teamId, memberId, rank) => {
    try {
      return await api.put(`/api/teams/${teamId}/members/${memberId}/rank`, {
        rank,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Remove member from team
   */
  removeMember: async (teamId, memberId) => {
    try {
      return await api.delete(`/api/teams/${teamId}/members/${memberId}`);
    } catch (error) {
      throw error;
    }
  },
};

export default teamService;