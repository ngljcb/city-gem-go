import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ImageBackground } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MapScreen from '@/components/MapScreen';
import PhotoVerification from '@/components/PhotoVerification';
import UserSessionManager from '@/components/UserSessionManager';
import RiddleManager from '@/components/RiddleManager';
import { getAuth } from 'firebase/auth';
import { styles } from '../constants/styles/Default';

const Riddles = () => {
  const { routeId } = useLocalSearchParams();
  const routeIdStr = Array.isArray(routeId) ? routeId[0] : routeId;
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [photoVerified, setPhotoVerified] = useState(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [riddleManager] = useState(new RiddleManager());
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (routeIdStr) {
      setLoading(true);
      riddleManager
        .loadRiddles(routeIdStr)
        .then(() => {
          const initialRiddle = riddleManager.getCurrentRiddle();
          if (!initialRiddle) {
            Alert.alert('Errore', 'Non è stato possibile caricare gli indovinelli.');
          }
        })
        .catch((error) => {
          console.error('Errore nel caricamento degli indovinelli:', error);
          Alert.alert('Errore', 'Non è stato possibile caricare gli indovinelli.');
        })
        .finally(() => setLoading(false));
    }
  }, [routeIdStr]);

  const currentRiddle = riddleManager.getCurrentRiddle();

  const checkAnswer = () => {
    if (riddleManager.checkAnswer(userAnswer)) {
      setIsCorrect(true);
      Alert.alert('Corretto!', 'Ora scatta una foto per procedere.');

      // Avvia la sessione al primo indovinello risolto
      if (riddleManager.isFirstRiddle() && user && routeIdStr) {
        UserSessionManager.startSession(user.uid, routeIdStr)
          .then(() => console.log('Session started'))
          .catch((error) => console.error('Error starting session:', error));
      }
    } else {
      Alert.alert('Sbagliato', 'Riprova con un’altra risposta.');
      setUserAnswer('');
    }
  };

  const handlePhotoVerified = async (success: boolean) => {
    if (success) {
      if (riddleManager.isLastRiddle()) {
        const totalTime = await UserSessionManager.completeSession();
        if (totalTime !== null) {
          setCompletionTime(totalTime);
          Alert.alert('Congratulazioni!', `Hai completato tutti gli indovinelli in ${formatTime(totalTime)} minuti.`);
        }
        router.replace('/routes');
      } else {
        setPhotoVerified(true);
        Alert.alert('Foto verificata!', 'Passa al prossimo indovinello.', [
          {
            text: 'Avanti',
            onPress: () => {
              riddleManager.moveToNextRiddle();
              setIsCorrect(false);
              setUserAnswer('');
              setPhotoVerified(false);
            },
          },
        ]);
      }
    } else {
      Alert.alert('Errore', 'La foto non è stata scattata nel posto giusto. Riprova.');
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <ImageBackground source={require('@/assets/images/riddles-backdrop.png')} style={styles.container} resizeMode="cover">
      {loading ? (
        <Image source={require('@/assets/images/loading.gif')} style={styles.img} resizeMode="cover" />
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>{currentRiddle?.question || 'Errore nel caricamento della domanda'}</Text>
          <TextInput style={styles.input} placeholder="Inserisci la tua risposta" value={userAnswer} onChangeText={setUserAnswer} />

          {!isCorrect && (
            <TouchableOpacity style={styles.button} onPress={checkAnswer}>
              <Text style={styles.buttonText}>Invia</Text>
            </TouchableOpacity>
          )}

          {isCorrect && currentRiddle && (
            <MapScreen
              key={`${currentRiddle.gps.latitude}-${currentRiddle.gps.longitude}`}
              latitude={currentRiddle.gps.latitude}
              longitude={currentRiddle.gps.longitude}
              isCorrect={isCorrect}
            />
          )}

          <PhotoVerification
            coordinates={currentRiddle ? currentRiddle.gps : { latitude: 0, longitude: 0 }}
            isAnswerCorrect={isCorrect}
            onPhotoVerified={handlePhotoVerified}
          />

          {completionTime !== null && <Text style={styles.timerText}>Tempo di completamento: {formatTime(completionTime)}</Text>}
        </View>
      )}
    </ImageBackground>
  );
};

export default Riddles;
