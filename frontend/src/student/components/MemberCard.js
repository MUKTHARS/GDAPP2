import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function MemberCard({ member, onSelect, currentRankings }) {
  const getRankForMember = () => {
    for (const [rank, memberId] of Object.entries(currentRankings)) {
      if (memberId === member.id) {
        return parseInt(rank);
      }
    }
    return null;
  };

  const currentRank = getRankForMember();
  const isSelected = currentRank !== null;

  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return ['#FFD700', '#FFA000'];
      case 2: return ['#E0E0E0', '#BDBDBD'];
      case 3: return ['#CD7F32', '#A0522D'];
      default: return ['#4F46E5', '#7C3AED'];
    }
  };

  const getRankLabel = (rank) => {
    switch(rank) {
      case 1: return '🥇 1st Place';
      case 2: return '🥈 2nd Place'; 
      case 3: return '🥉 3rd Place';
      default: return `Rank ${rank}`;
    }
  };

  return (
    <View style={styles.memberCardContainer}>
      <View style={[styles.memberCard, isSelected && styles.selectedCard]}>
        {/* Member Info Section */}
        <View style={styles.memberInfoContainer}>
          <View style={styles.profileImageContainer}>
            {member.profileImage ? (
              <Image
                source={{ uri: member.profileImage }}
                style={styles.profileImage}
                onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
              />
            ) : (
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.profileImageGradient}
              >
                <Icon name="person" size={20} color="#fff" />
              </LinearGradient>
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.name}</Text>
            <Text style={styles.memberEmail}>{member.email}</Text>
            {member.department && (
              <View style={styles.departmentContainer}>
                <Icon name="domain" size={12} color="#64748B" />
                <Text style={styles.memberDepartment}>{member.department}</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Selection Status */}
        {isSelected ? (
          <View style={styles.selectedRankContainer}>
            <LinearGradient
              colors={getRankColor(currentRank)}
              style={styles.rankBadge}
            >
              <Text style={styles.rankBadgeText}>{getRankLabel(currentRank)}</Text>
            </LinearGradient>
            <TouchableOpacity
              style={styles.removeButtonContainer}
              onPress={() => onSelect(currentRank, null)}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.removeButton}
              >
                <Icon name="close" size={16} color="#fff" />
                <Text style={styles.removeButtonText}>Remove</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.rankingButtons}>
            {[1, 2, 3].map(rank => {
              // Only disable if this specific rank is taken by someone ELSE (not this member)
              const isRankTakenByOther = currentRankings[rank] && currentRankings[rank] !== member.id;
              
              return (
                <TouchableOpacity
                  key={rank}
                  style={styles.rankButtonContainer}
                  onPress={() => onSelect(rank, member.id)}
                  disabled={isRankTakenByOther}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isRankTakenByOther 
                      ? ['#6B7280', '#4B5563'] 
                      : getRankColor(rank)}
                    style={[styles.rankButton, isRankTakenByOther && styles.disabledRankButton]}
                  >
                    <Text style={[styles.rankButtonEmoji, isRankTakenByOther && styles.disabledText]}>
                      {rank === 1 && '🥇'}
                      {rank === 2 && '🥈'}
                      {rank === 3 && '🥉'}
                    </Text>
                    <Text style={[styles.rankButtonLabel, isRankTakenByOther && styles.disabledText]}>
                      {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  memberCardContainer: {
    marginBottom: 12,
  },
  memberCard: {
    backgroundColor: '#090d13ff', // dark background
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.5,
    elevation: 12,
  },
  memberInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  profileImageGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F8FAFC', // light text
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#94A3B8', // muted gray
    marginBottom: 4,
  },
  departmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  memberDepartment: {
    fontSize: 12,
    color: '#64748B', // subtle gray
  },
  selectedRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rankBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  rankBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  removeButtonContainer: {
    marginLeft: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rankingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  rankButtonContainer: {
    borderRadius: 25,
    overflow: 'hidden',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rankButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledRankButton: {
    opacity: 0.5,
  },
  rankButtonEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  rankButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  disabledText: {
    color: 'rgba(255,255,255,0.5)',
  },
});