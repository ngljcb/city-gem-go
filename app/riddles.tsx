import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ImageBackground } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MapScreen from '@/components/MapScreen';
import PhotoVerification from '@/components/PhotoVerification';
import UserSessionManager from '@/models/UserSessionManager';
import RiddleController from '@/controllers/RiddleController';
import { getAuth } from 'firebase/auth';
import { styles } from '../styles/Default';
import FloatingButton from '@/components/FloatingButton';

const Riddles = () => {
  const { routeId } = useLocalSearchParams();
  const routeIdStr = Array.isArray(routeId) ? routeId[0] : routeId;
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [photoVerified, setPhotoVerified] = useState(false);
  const [completionTime, setCompletionTime] = useState<number | null>(null);
  const [riddleController] = useState(new RiddleController());
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (routeIdStr) {
      setLoading(true);
      riddleController
        .loadRiddles(routeIdStr)
        .then(() => {
          const initialRiddle = riddleController.getCurrentRiddle();
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

  const currentRiddle = riddleController.getCurrentRiddle();

  const checkAnswer = () => {
    if (riddleController.checkAnswer(userAnswer)) {
      setIsCorrect(true);
      Alert.alert('Corretto!', 'Ora scatta una foto per procedere.');

      // Avvia la sessione al primo indovinello risolto
      if (riddleController.isFirstRiddle() && user && routeIdStr) {
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
      if (riddleController.isLastRiddle()) {
        const totalTime = await UserSessionManager.completeSession();
        if (totalTime !== null) {
          setCompletionTime(totalTime);
          handleRouteSelect(totalTime.toString(), routeIdStr.toString());
        }
      } else {
        setPhotoVerified(true);
        Alert.alert('Foto verificata!', 'Passa al prossimo indovinello.', [
          {
            text: 'Avanti',
            onPress: () => {
              riddleController.moveToNextRiddle();
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

  const handleRouteSelect = (totalTime: string, routeId: string) => {
    router.push({
      pathname: '/results',
      params: { totalTime, routeId },
    });
  };

  return (
    <ImageBackground source={require('@/assets/images/riddles-backdrop.png')} style={styles.container} resizeMode="cover">
      {loading ? (
        <Image source={require('@/assets/images/loading.gif')} style={styles.img} resizeMode="cover" />
      ) : (
        <View style={styles.content}>
          <Text style={styles.text}>{isCorrect ? currentRiddle?.answer : currentRiddle?.question}</Text>
          {!isCorrect && <TextInput style={styles.input} placeholder="Inserisci la tua risposta" value={userAnswer} onChangeText={setUserAnswer} />}

          {!isCorrect && (
            <TouchableOpacity style={styles.button} onPress={checkAnswer}>
              <Text style={styles.buttonText}>Invia</Text>
            </TouchableOpacity>
          )}

          {isCorrect && currentRiddle && (
            <MapScreen
              key={`${currentRiddle.latitude}-${currentRiddle.longitude}`}
              latitude={currentRiddle.latitude}
              longitude={currentRiddle.longitude}
              isCorrect={isCorrect}
            />
          )}

          <PhotoVerification
            coordinates={currentRiddle ? { latitude: currentRiddle.latitude, longitude: currentRiddle.longitude } : { latitude: 0, longitude: 0 }}
            isAnswerCorrect={isCorrect}
            onPhotoVerified={handlePhotoVerified}
          />
        </View>
      )}
      <FloatingButton />
    </ImageBackground>
  );
};

export default Riddles;
