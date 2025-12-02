import { useState, useEffect, useCallback } from 'react';
import teamService from '../services/teamService';

/**
 * Custom hook for managing teams
 * Provides common team operations with loading and error states
 */
export const useTeams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all teams for the current user
   */
  const fetchMyTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getMyTeams();
      const teamsArray = Array.isArray(data) ? data : [];
      setTeams(teamsArray);
      return teamsArray;
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Failed to fetch teams');
      setTeams([]);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a specific team by ID
   */
  const fetchTeamById = useCallback(async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getTeamById(teamId);
      return data;
    } catch (err) {
      console.error('Error fetching team:', err);
      setError(err.message || 'Failed to fetch team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new team
   */
  const createTeam = useCallback(async (teamData, logoFile = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamService.createTeam(teamData, logoFile);
      await fetchMyTeams(); // Refresh the teams list
      return result;
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.message || 'Failed to create team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyTeams]);

  /**
   * Join a team by code
   */
  const joinTeamByCode = useCallback(async (teamCode) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamService.joinTeamByCode(teamCode);
      await fetchMyTeams(); // Refresh the teams list
      return result;
    } catch (err) {
      console.error('Error joining team:', err);
      setError(err.message || 'Failed to join team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyTeams]);

  /**
   * Leave a team
   */
  const leaveTeam = useCallback(async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamService.leaveTeam(teamId);
      await fetchMyTeams(); // Refresh the teams list
      return result;
    } catch (err) {
      console.error('Error leaving team:', err);
      setError(err.message || 'Failed to leave team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyTeams]);

  /**
   * Delete a team
   */
  const deleteTeam = useCallback(async (teamId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamService.deleteTeam(teamId);
      await fetchMyTeams(); // Refresh the teams list
      return result;
    } catch (err) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Failed to delete team');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchMyTeams]);

  /**
   * Update member role
   */
  const updateMemberRole = useCallback(async (teamId, memberId, role) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamService.updateMemberRole(teamId, memberId, role);
      return result;
    } catch (err) {
      console.error('Error updating member role:', err);
      setError(err.message || 'Failed to update member role');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update member rank
   */
  const updateMemberRank = useCallback(async (teamId, memberId, rank) => {
    setLoading(true);
    setError(null);
    try {
      const result = await teamService.updateMemberRank(teamId, memberId, rank);
      return result;
    } catch (err) {
      console.error('Error updating member rank:', err);
      setError(err.message || 'Failed to update member rank');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    teams,
    loading,
    error,
    fetchMyTeams,
    fetchTeamById,
    createTeam,
    joinTeamByCode,
    leaveTeam,
    deleteTeam,
    updateMemberRole,
    updateMemberRank,
  };
};

export default useTeams;