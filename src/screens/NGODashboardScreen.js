import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { donationsAPI } from '../lib/api';

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function NGODashboardScreen() {
  const { user, logout } = useAuth();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);

  const fetchAll = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true); else setRefreshing(true);
      const res = await donationsAPI.getAll();
      const list = res?.data?.donations || res?.data || [];
      setAll(Array.isArray(list) ? list : []);
      setRadiusKm(user?.ngoDetails?.operationalRadius || 20);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { if (user) fetchAll(true); }, [user]);

  const filtered = useMemo(() => {
    let items = (all || []).filter(d => d.status === 'available' && new Date(d.expiryTime) > new Date());
    if (user?.location?.coordinates) {
      const { lat, lng } = user.location.coordinates;
      items = items.filter(d => {
        const c = d?.location?.coordinates;
        if (!c?.lat || !c?.lng) return false;
        return haversineKm(lat, lng, c.lat, c.lng) <= radiusKm;
      });
    }
    return items;
  }, [all, user, radiusKm]);

  if (!user) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Please sign in</Text>
    </View>
  );

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <View style={{ padding: 16, backgroundColor: '#16a34a', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>NGO Dashboard</Text>
        <TouchableOpacity onPress={logout}><Text style={{ color: '#fff' }}>Logout</Text></TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(false)} />}        
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={() => (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#374151' }}>Nearby available donations within {radiusKm}km</Text>
            {!user?.location?.coordinates ? (
              <Text style={{ marginTop: 6, color: '#b45309' }}>Set NGO location on web to enable proximity filtering.</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text>No nearby donations</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '700', marginBottom: 4 }}>{item.title || 'Donation'}</Text>
            <Text style={{ color: '#555' }}>{item.description}</Text>
            <Text style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>Status: {item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}


