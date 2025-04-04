import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { createGroup, joinGroup } from '../../services/groups';
import { supabase } from '../../services/supabase';
import { Ionicons } from '@expo/vector-icons';

interface InitialGroupScreenProps {
  onGroupJoined: () => void;
  parentRefreshing?: boolean;
  onParentRefresh?: () => void;
}

export function InitialGroupScreen({ 
  onGroupJoined, 
  parentRefreshing = false,
  onParentRefresh 
}: InitialGroupScreenProps) {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  const handleCreateGroup = async () => {
    Alert.alert(
      'Create Group',
      'Are you sure you want to create a group?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) {
                Alert.alert('Error', 'You must be logged in to create a group');
                return;
              }

              const group = await createGroup(user.id);
              if (group) {
                onGroupJoined();
              } else {
                Alert.alert('Error', 'Failed to create group');
              }
            } catch (error) {
              console.error('Error creating group:', error);
              Alert.alert('Error', 'Failed to create group');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to join a group');
        return;
      }

      const group = await joinGroup(user.id, joinCode.trim().toUpperCase());
      if (group) {
        onGroupJoined();
      } else {
        Alert.alert('Error', 'Invalid join code or failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('InitialGroupScreen - Manual refresh triggered');
    if (onParentRefresh) {
      onParentRefresh();
    } else {
      setRefreshing(true);
      // Since there's no data to refresh in this screen, just simulate a refresh
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  }, [onParentRefresh]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E83" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
      refreshControl={
        <RefreshControl
          refreshing={parentRefreshing || refreshing}
          onRefresh={onRefresh}
          tintColor="#4B2E83"
          colors={["#4B2E83"]}
        />
      }
    >
      {showJoinInput ? (
        <View style={styles.joinContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setShowJoinInput(false);
              setJoinCode('');
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#4B2E83" />
          </TouchableOpacity>

          <Text style={styles.headerText}>Join Group</Text>
          <Text style={styles.joinText}>Enter the 6-character join code</Text>
          
          <TouchableOpacity 
            style={styles.codeInputContainer}
            activeOpacity={0.9}
            onPress={() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            <TextInput
              ref={inputRef}
              style={styles.codeInput}
              value={joinCode}
              onChangeText={(text) => {
                const cleanText = text.slice(0, 6).toUpperCase();
                setJoinCode(cleanText);
              }}
              autoCapitalize="characters"
              maxLength={6}
              placeholder="Enter code"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.digitBoxes}>
              {[...Array(6)].map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.digitBox,
                    index < joinCode.length && styles.digitBoxFilled
                  ]}
                >
                  {index < joinCode.length && (
                    <Text style={styles.digit}>{joinCode[index]}</Text>
                  )}
                </View>
              ))}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button,
              styles.joinButton,
              joinCode.length !== 6 && styles.buttonDisabled
            ]}
            onPress={handleJoinGroup}
            disabled={joinCode.length !== 6}
          >
            <Text style={styles.buttonText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Text style={styles.headerText}>
            Create or join a group to get started
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateGroup}
            >
              <Ionicons name="add-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Create a Group</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.outlineButton]}
              onPress={() => setShowJoinInput(true)}
            >
              <Ionicons name="people-outline" size={24} color="#4B2E83" />
              <Text style={styles.outlineButtonText}>Join with Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 8,
    zIndex: 1,
  },
  headerText: {
    fontSize: 28,
    color: '#4B2E83',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 36,
    fontWeight: '600',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 16,
  },
  joinContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingTop: 40,
  },
  joinText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    fontWeight: '500',
  },
  codeInputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  codeInput: {
    position: 'absolute',
    width: '100%',
    height: 60,
    opacity: 0,
    zIndex: 1,
  },
  digitBoxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  digitBox: {
    width: 45,
    height: 60,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxFilled: {
    borderColor: '#4B2E83',
    backgroundColor: '#f8f8f8',
  },
  digit: {
    fontSize: 24,
    color: '#4B2E83',
    fontWeight: '600',
  },
  button: {
    minHeight: 56,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButton: {
    backgroundColor: '#4B2E83',
    width: '100%',
    marginBottom: 12,
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4B2E83',
    width: '100%',
    shadowOpacity: 0,
    elevation: 0,
  },
  joinButton: {
    backgroundColor: '#4B2E83',
    width: '90%',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#4B2E83',
    fontSize: 18,
    fontWeight: '600',
  },
}); 