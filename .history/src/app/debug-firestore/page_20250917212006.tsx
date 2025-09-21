"use client";

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider,
} from "@mui/material";
import { collection, getDocs, query, limit, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DebugFirestorePage() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);

      console.log("🔍 Démarrage du diagnostic Firestore...");

      const results: any = {
        timestamp: new Date().toISOString(),
        firebaseConfig: {
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        },
        collections: {},
        sampleDocuments: {},
        errors: [],
      };

      // 1. Vérifier la configuration Firebase
      console.log("📋 Configuration Firebase:", results.firebaseConfig);

      // 2. Tester les collections connues
      const collectionsToTest = [
        "players",
        "users", 
        "teams",
        "matches",
        "compositions",
        "availabilities",
        "sync_logs",
        "club_settings"
      ];

      for (const collectionName of collectionsToTest) {
        try {
          console.log(`🔍 Test de la collection: ${collectionName}`);
          const collectionRef = collection(db, collectionName);
          const q = query(collectionRef, limit(5));
          const querySnapshot = await getDocs(q);
          
          results.collections[collectionName] = {
            exists: !querySnapshot.empty,
            count: querySnapshot.size,
            documents: querySnapshot.docs.map(doc => ({
              id: doc.id,
              data: doc.data()
            }))
          };

          console.log(`✅ Collection ${collectionName}: ${querySnapshot.size} documents`);
        } catch (collectionError: any) {
          console.error(`❌ Erreur collection ${collectionName}:`, collectionError);
          results.errors.push({
            collection: collectionName,
            error: collectionError.message,
            code: collectionError.code
          });
        }
      }

      // 3. Tester un document spécifique si la collection players existe
      if (results.collections.players?.exists) {
        try {
          console.log("🔍 Test d'un document spécifique dans players...");
          const playersRef = collection(db, "players");
          const firstQuery = query(playersRef, limit(1));
          const firstSnapshot = await getDocs(firstQuery);
          
          if (!firstSnapshot.empty) {
            const firstDoc = firstSnapshot.docs[0];
            results.sampleDocuments.players = {
              id: firstDoc.id,
              data: firstDoc.data(),
              metadata: {
                hasPendingWrites: firstDoc.metadata.hasPendingWrites,
                fromCache: firstDoc.metadata.fromCache
              }
            };
          }
        } catch (docError: any) {
          console.error("❌ Erreur document players:", docError);
          results.errors.push({
            type: "document_test",
            error: docError.message,
            code: docError.code
          });
        }
      }

      // 4. Vérifier les logs de synchronisation
      if (results.collections.sync_logs?.exists) {
        try {
          console.log("🔍 Récupération des logs de synchronisation...");
          const syncLogsRef = collection(db, "sync_logs");
          const logsQuery = query(syncLogsRef, limit(10));
          const logsSnapshot = await getDocs(logsQuery);
          
          results.syncLogs = logsSnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }));
        } catch (logsError: any) {
          console.error("❌ Erreur logs de synchronisation:", logsError);
          results.errors.push({
            type: "sync_logs",
            error: logsError.message,
            code: logsError.code
          });
        }
      }

      console.log("📊 Diagnostic terminé:", results);
      setDebugInfo(results);

    } catch (error: any) {
      console.error("❌ Erreur générale diagnostic:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Diagnostic Firestore - SQY Ping
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={runDiagnostic}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : "Lancer le Diagnostic"}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erreur: {error}
        </Alert>
      )}

      {debugInfo && (
        <Grid container spacing={3}>
          {/* Configuration Firebase */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuration Firebase
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Project ID: {debugInfo.firebaseConfig.projectId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Auth Domain: {debugInfo.firebaseConfig.authDomain}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Timestamp: {debugInfo.timestamp}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Collections */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Collections Firestore
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(debugInfo.collections).map(([name, info]: [string, any]) => (
                    <Grid item xs={12} sm={6} md={4} key={name}>
                      <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          {name}
                        </Typography>
                        <Chip 
                          label={info.exists ? `${info.count} docs` : "Vide"} 
                          color={info.exists ? "success" : "default"}
                          size="small"
                        />
                        {info.exists && info.count > 0 && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Premier doc: {info.documents[0]?.id}
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Logs de synchronisation */}
          {debugInfo.syncLogs && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Logs de Synchronisation
                  </Typography>
                  {debugInfo.syncLogs.map((log: any, index: number) => (
                    <Box key={log.id} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Log #{index + 1} - {log.data.type}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {log.data.message} - {new Date(log.data.timestamp?.seconds * 1000).toLocaleString()}
                      </Typography>
                      {log.data.synced && (
                        <Typography variant="caption">
                          Synchronisés: {log.data.synced}/{log.data.total}
                        </Typography>
                      )}
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Erreurs */}
          {debugInfo.errors.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="error">
                    Erreurs Détectées
                  </Typography>
                  {debugInfo.errors.map((error: any, index: number) => (
                    <Alert key={index} severity="error" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2">
                        {error.collection || error.type}
                      </Typography>
                      <Typography variant="body2">
                        {error.error} (Code: {error.code})
                      </Typography>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Document d'exemple */}
          {debugInfo.sampleDocuments.players && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Exemple de Document Players
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ 
                    backgroundColor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1,
                    overflow: 'auto',
                    fontSize: '0.875rem'
                  }}>
                    {JSON.stringify(debugInfo.sampleDocuments.players, null, 2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
