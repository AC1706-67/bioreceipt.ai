/**
 * Logs Screen Component
 * Development/Admin screen for viewing application logs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { LoggingService, LogEntry, LogLevel } from '../../services/logging/loggingService';

export const LogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loggingService = LoggingService.getInstance();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, selectedLevel, searchQuery]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const allLogs = await loggingService.getAllLogs();
      setLogs(allLogs.reverse()); // Show newest first
    } catch (error) {
      console.error('Error loading logs:', error);
      Alert.alert('Error', 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filter by level
    if (selectedLevel !== 'all') {
      filtered = filtered.filter(log => log.level === selectedLevel);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.correlationId.toLowerCase().includes(query) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(query))
      );
    }

    setFilteredLogs(filtered);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Clear All Logs',
      'Are you sure you want to clear all logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await loggingService.clearAllLogs();
              setLogs([]);
              setFilteredLogs([]);
              Alert.alert('Success', 'All logs have been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear logs');
            }
          },
        },
      ]
    );
  };

  const handleExportLogs = async () => {
    try {
      const exportData = await loggingService.exportLogs();
      // In a real app, you'd share this data or save to file
      Alert.alert(
        'Export Logs',
        `Exported ${logs.length} log entries. In a real app, this would be saved to a file or shared.`,
        [{ text: 'OK' }]
      );
      console.log('Exported logs:', exportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return '#e74c3c';
      case 'warn':
        return '#f39c12';
      case 'info':
        return '#3498db';
      case 'debug':
        return '#95a5a6';
      default:
        return '#2c3e50';
    }
  };

  const getLevelIcon = (level: LogLevel): string => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'debug':
        return '🔍';
      default:
        return '📝';
    }
  };

  const renderLogEntry = (log: LogEntry) => {
    const isExpanded = expandedLogId === log.id;

    return (
      <TouchableOpacity
        key={log.id}
        style={styles.logEntry}
        onPress={() => toggleLogExpansion(log.id)}
      >
        <View style={styles.logHeader}>
          <View style={styles.logHeaderLeft}>
            <Text style={styles.logIcon}>{getLevelIcon(log.level)}</Text>
            <View style={styles.logHeaderInfo}>
              <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                {log.level.toUpperCase()}
              </Text>
              <Text style={styles.logTimestamp}>
                {formatTimestamp(log.timestamp)}
              </Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </View>

        <Text style={styles.logMessage} numberOfLines={isExpanded ? undefined : 2}>
          {log.message}
        </Text>

        {isExpanded && (
          <View style={styles.logDetails}>
            <View style={styles.logDetailRow}>
              <Text style={styles.logDetailLabel}>Correlation ID:</Text>
              <Text style={styles.logDetailValue}>{log.correlationId}</Text>
            </View>

            {log.userId && (
              <View style={styles.logDetailRow}>
                <Text style={styles.logDetailLabel}>User ID:</Text>
                <Text style={styles.logDetailValue}>{log.userId}</Text>
              </View>
            )}

            <View style={styles.logDetailRow}>
              <Text style={styles.logDetailLabel}>Session ID:</Text>
              <Text style={styles.logDetailValue}>{log.sessionId}</Text>
            </View>

            {log.metadata && (
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Metadata:</Text>
                <Text style={styles.logDetailJson}>
                  {JSON.stringify(log.metadata, null, 2)}
                </Text>
              </View>
            )}

            {log.stackTrace && (
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Stack Trace:</Text>
                <ScrollView style={styles.stackTraceContainer} horizontal>
                  <Text style={styles.stackTrace}>{log.stackTrace}</Text>
                </ScrollView>
              </View>
            )}

            {log.deviceInfo && (
              <View style={styles.logDetailSection}>
                <Text style={styles.logDetailLabel}>Device Info:</Text>
                <Text style={styles.logDetailJson}>
                  {JSON.stringify(log.deviceInfo, null, 2)}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderLevelFilter = () => {
    const levels: Array<LogLevel | 'all'> = ['all', 'error', 'warn', 'info', 'debug'];

    return (
      <ScrollView 
        horizontal 
        style={styles.levelFilter}
        showsHorizontalScrollIndicator={false}
      >
        {levels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.levelButton,
              selectedLevel === level && styles.selectedLevelButton,
            ]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text style={[
              styles.levelButtonText,
              selectedLevel === level && styles.selectedLevelButtonText,
            ]}>
              {level === 'all' ? 'All' : level.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Application Logs</Text>
        <Text style={styles.subtitle}>
          {filteredLogs.length} of {logs.length} entries
        </Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {renderLevelFilter()}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportLogs}>
          <Text style={styles.actionButtonText}>📤 Export</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]} 
          onPress={handleClearLogs}
        >
          <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
            🗑️ Clear All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      <ScrollView
        style={styles.logsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No logs found</Text>
            <Text style={styles.emptyMessage}>
              {logs.length === 0 
                ? 'No logs have been recorded yet.'
                : 'No logs match your current filters.'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.logsContainer}>
            {filteredLogs.map(renderLogEntry)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  levelFilter: {
    flexDirection: 'row',
  },
  levelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedLevelButton: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  levelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  selectedLevelButtonText: {
    color: '#ffffff',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  dangerButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  dangerButtonText: {
    color: '#e53e3e',
  },
  logsList: {
    flex: 1,
  },
  logsContainer: {
    padding: 16,
  },
  logEntry: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  logHeaderInfo: {
    flex: 1,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTimestamp: {
    fontSize: 10,
    color: '#6c757d',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
    color: '#6c757d',
  },
  logMessage: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 18,
  },
  logDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  logDetailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  logDetailSection: {
    marginBottom: 8,
  },
  logDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    minWidth: 100,
  },
  logDetailValue: {
    fontSize: 12,
    color: '#6c757d',
    flex: 1,
    fontFamily: 'monospace',
  },
  logDetailJson: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  stackTraceContainer: {
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    marginTop: 4,
  },
  stackTrace: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'monospace',
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});