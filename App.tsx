import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  LogBox,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';

LogBox.ignoreLogs(['Cannot record touch move without a touch start']);
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './lib/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLOR_GOOD = '#0ca30c';
const COLOR_CRITICAL = '#d03b3b';
const COLOR_PAGE = '#e8e6e0';
const TEXT_INK = '#1c1c1c';
const TEXT_INK_MUTED = '#6e6d68';

const GRAPHITE_GRADIENT = ['#3c3c3e', '#1a1a1c'] as const;
const TEXT_ON_GRAPHITE = '#f5f5f3';
const TEXT_ON_GRAPHITE_MUTED = '#9c9b96';
const BEVEL = {
  borderWidth: 1,
  borderTopColor: 'rgba(255,255,255,0.14)',
  borderLeftColor: 'rgba(255,255,255,0.08)',
  borderBottomColor: 'rgba(0,0,0,0.45)',
  borderRightColor: 'rgba(0,0,0,0.3)',
};
const LIGHT_CARD_BG = '#f4f3ef';
const LIGHT_CARD_BORDER = 'rgba(0,0,0,0.08)';

const LOGO = require('./assets/brand/trezo-logo-transparent.png');
const LOGO_ASPECT_RATIO = 790 / 323;

const CHART_HEIGHT = 180;
const BAR_WIDTH = 16;
const BAR_GAP = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

type TransactionType = 'entree' | 'sortie';

type CategoryDef = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ENTREE_CATEGORIES: CategoryDef[] = [
  { key: 'salaire', label: 'Salaire', icon: 'cash-outline' },
  { key: 'vente', label: 'Vente', icon: 'pricetag-outline' },
  { key: 'remboursement', label: 'Remboursement', icon: 'arrow-undo-outline' },
  { key: 'transfert', label: 'Transfert', icon: 'swap-horizontal-outline' },
  { key: 'autre_entree', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
];

const SORTIE_CATEGORIES: CategoryDef[] = [
  { key: 'courses', label: 'Courses', icon: 'cart-outline' },
  { key: 'transport', label: 'Transport', icon: 'car-outline' },
  { key: 'loyer', label: 'Loyer', icon: 'home-outline' },
  { key: 'facture', label: 'Facture', icon: 'receipt-outline' },
  { key: 'achat', label: 'Achat', icon: 'bag-outline' },
  { key: 'retrait_perso', label: 'Retrait perso', icon: 'person-outline' },
  { key: 'autre_sortie', label: 'Autre', icon: 'ellipsis-horizontal-outline' },
];

function categoriesFor(type: TransactionType): CategoryDef[] {
  return type === 'entree' ? ENTREE_CATEGORIES : SORTIE_CATEGORIES;
}

function categoryInfo(type: TransactionType, key: string): CategoryDef {
  const list = categoriesFor(type);
  return list.find((c) => c.key === key) ?? list[list.length - 1];
}

const PERIOD_OPTIONS: { key: '7' | '30' | 'all'; label: string }[] = [
  { key: '7', label: '7 jours' },
  { key: '30', label: '30 jours' },
  { key: 'all', label: 'Tout' },
];

type Transaction = {
  id: string;
  type: TransactionType;
  category: string;
  label: string;
  amount: number;
  author: string;
  date: number;
  personal: boolean;
};

type Screen = 'loading' | 'register' | 'login' | 'app';

function displayNameFor(user: { user_metadata?: any; email?: string | null } | null | undefined): string {
  return user?.user_metadata?.display_name ?? user?.email ?? '';
}

function normalizeTransaction(row: any): Transaction {
  return {
    id: String(row.id),
    type: row.type,
    category: row.category,
    label: row.label,
    amount: Number(row.amount),
    author: row.author,
    date: Number(row.date),
    personal: Boolean(row.personal),
  };
}

function GraphiteCard({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <LinearGradient
      colors={GRAPHITE_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.graphiteCard, style]}
    >
      {children}
    </LinearGradient>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function AnimatedButton({
  style,
  onPress,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: Platform.OS !== 'web', speed: 40 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 40 }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      <LinearGradient
        colors={GRAPHITE_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.graphiteFill}
      >
        {children}
      </LinearGradient>
    </AnimatedPressable>
  );
}

function AnimatedBalance({
  value,
  style,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(1.08);
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 4, tension: 40 }).start();
  }, [value]);

  return (
    <Animated.Text
      style={[
        style,
        { color: value < 0 ? COLOR_CRITICAL : COLOR_GOOD, transform: [{ scale }] },
      ]}
    >
      {value.toFixed(2)} €
    </Animated.Text>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  const width = compact ? 150 : 230;
  return (
    <View style={[styles.brandRow, compact && styles.brandRowCompact]}>
      <Image
        source={LOGO}
        resizeMode="contain"
        style={{ width, aspectRatio: LOGO_ASPECT_RATIO }}
      />
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [currentUser, setCurrentUser] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState('');

  const [formType, setFormType] = useState<TransactionType>('entree');
  const [formCategory, setFormCategory] = useState<string>(ENTREE_CATEGORIES[0].key);
  const [formPersonal, setFormPersonal] = useState(false);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [tab, setTab] = useState<'transactions' | 'historique'>('transactions');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'7' | '30' | 'all'>('all');

  const tabFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Expo's web template disables body scrolling by default, assuming a
      // ScrollView/FlatList will handle it internally. Our nested flex layout
      // doesn't resolve a bounded height for that, so we restore normal page
      // scrolling instead.
      const html = document.documentElement as HTMLElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      html.style.overflow = 'auto';
      body.style.overflow = 'auto';
      return () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
      };
    }
  }, []);

  useEffect(() => {
    tabFade.setValue(0);
    Animated.timing(tabFade, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [tab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(displayNameFor(session.user));
        setScreen('app');
      } else {
        setScreen('login');
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(displayNameFor(session.user));
        setScreen('app');
      } else {
        setCurrentUser('');
        setScreen('login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (screen !== 'app') return;

    let isMounted = true;

    const loadTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (isMounted && !error && data) {
        setTransactions(data.map(normalizeTransaction));
        setTransactionsError('');
      } else if (isMounted && error) {
        setTransactionsError(error.message);
      }
      if (isMounted) {
        setTransactionsLoading(false);
      }
    };

    loadTransactions();

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

          if (payload.eventType === 'INSERT') {
            const incoming = normalizeTransaction(payload.new);
            setTransactions((current) =>
              current.some((t) => t.id === incoming.id) ? current : [incoming, ...current]
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeTransaction(payload.new);
            setTransactions((current) =>
              current.map((t) => (t.id === updated.id ? updated : t))
            );
          } else if (payload.eventType === 'DELETE') {
            const removedId = String(payload.old.id);
            setTransactions((current) => current.filter((t) => t.id !== removedId));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [screen]);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Nom, email et mot de passe (6 caractères min.) requis');
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setError('Compte créé. Vérifie ton email pour confirmer avant de te connecter.');
      return;
    }

    setError('');
    setPassword('');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setError('');
    setPassword('');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const switchAuthScreen = () => {
    setScreen((current) => (current === 'register' ? 'login' : 'register'));
    setError('');
  };

  const balance = transactions.reduce(
    (total, t) => total + (t.type === 'entree' ? t.amount : -t.amount),
    0
  );

  const benefit = transactions
    .filter((t) => !t.personal)
    .reduce((total, t) => total + (t.type === 'entree' ? t.amount : -t.amount), 0);

  const personalTransactions = transactions.filter(
    (t) => t.author === currentUser && t.personal
  );
  const personalBalance = personalTransactions.reduce(
    (total, t) => total + (t.type === 'entree' ? t.amount : -t.amount),
    0
  );

  const resetForm = () => {
    setLabel('');
    setAmount('');
    setFormError('');
    setEditingId(null);
    setFormType('entree');
    setFormCategory(ENTREE_CATEGORIES[0].key);
    setFormPersonal(false);
  };

  const handleFormTypeChange = (type: TransactionType) => {
    setFormType(type);
    setFormCategory(categoriesFor(type)[0].key);
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormType(t.type);
    setFormCategory(t.category);
    setFormPersonal(t.personal);
    setLabel(t.label);
    setAmount(t.amount.toString());
    setFormError('');
  };

  const handleDelete = async (id: string) => {
    if (editingId === id) {
      resetForm();
    }
    await supabase.from('transactions').delete().eq('id', id);
  };

  const handleSaveTransaction = async () => {
    if (!label.trim()) {
      setFormError('Ajoute une description');
      return;
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Le montant doit être un nombre supérieur à 0');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('transactions')
        .update({
          type: formType,
          category: formCategory,
          label: label.trim(),
          amount: parsedAmount,
          personal: formPersonal,
        })
        .eq('id', editingId);

      if (error) {
        setFormError('Erreur de synchronisation, réessaie');
        return;
      }
    } else {
      const newTransaction: Transaction = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: formType,
        category: formCategory,
        label: label.trim(),
        amount: parsedAmount,
        author: currentUser,
        date: Date.now(),
        personal: formPersonal,
      };
      const { error } = await supabase.from('transactions').insert(newTransaction);

      if (error) {
        setFormError('Erreur de synchronisation, réessaie');
        return;
      }
    }

    resetForm();
  };

  const historyPoints = [...personalTransactions]
    .reverse()
    .reduce<{ id: string; label: string; balance: number; date: number }[]>((acc, t) => {
      const previousBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
      const delta = t.type === 'entree' ? t.amount : -t.amount;
      acc.push({ id: t.id, label: t.label, balance: previousBalance + delta, date: t.date });
      return acc;
    }, []);

  const periodCutoff = periodFilter === 'all' ? 0 : Date.now() - Number(periodFilter) * DAY_MS;
  const visibleHistoryPoints = historyPoints.filter((p) => p.date >= periodCutoff);

  const maxAbsBalance = Math.max(1, ...visibleHistoryPoints.map((p) => Math.abs(p.balance)));
  const selectedPoint =
    visibleHistoryPoints.find((p) => p.id === selectedPointId) ??
    visibleHistoryPoints[visibleHistoryPoints.length - 1] ??
    null;
  const isInDebt = personalBalance < 0;

  if (screen === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TEXT_INK} />
      </View>
    );
  }

  if (screen === 'register' || screen === 'login') {
    const isRegister = screen === 'register';
    return (
      <KeyboardAvoidingView
        style={styles.centered}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="auto" />
        <Brand />
        <Text style={styles.title}>
          {isRegister ? 'Créer un compte' : 'Connexion'}
        </Text>

        {isRegister && (
          <GraphiteCard style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="Ton nom"
              placeholderTextColor={TEXT_ON_GRAPHITE_MUTED}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </GraphiteCard>
        )}

        <GraphiteCard style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={TEXT_ON_GRAPHITE_MUTED}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </GraphiteCard>

        <GraphiteCard style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={TEXT_ON_GRAPHITE_MUTED}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </GraphiteCard>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AnimatedButton
          style={styles.primaryButton}
          onPress={isRegister ? handleRegister : handleLogin}
        >
          <Text style={styles.buttonText}>
            {isRegister ? 'Créer mon compte' : 'Se connecter'}
          </Text>
        </AnimatedButton>

        <Pressable onPress={switchAuthScreen} style={styles.switchAuthLink}>
          <Text style={styles.switchAuthText}>
            {isRegister ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="auto" />

      <Brand compact />

      <View style={styles.header}>
        <Text style={styles.welcomeText}>Bonjour, {currentUser}</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </View>

      <GraphiteCard style={styles.balanceBlock}>
        <Text style={styles.balanceLabel}>Solde Commun</Text>
        <AnimatedBalance value={balance} style={styles.balanceValue} />
        <Text style={styles.balanceHint}>
          Partagé en temps réel avec tous les utilisateurs
        </Text>
      </GraphiteCard>

      <GraphiteCard style={styles.benefitBlock}>
        <Text style={styles.balanceLabel}>Solde Bénéfice</Text>
        <AnimatedBalance value={benefit} style={styles.benefitValue} />
        <Text style={styles.balanceHint}>Business uniquement, hors mouvements perso</Text>
      </GraphiteCard>

      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tab, tab === 'transactions' ? styles.tabActive : styles.tabInactive]}
          onPress={() => setTab('transactions')}
        >
          <Text style={tab === 'transactions' ? styles.tabTextActive : styles.tabTextInactive}>
            Transactions
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'historique' ? styles.tabActive : styles.tabInactive]}
          onPress={() => setTab('historique')}
        >
          <Text style={tab === 'historique' ? styles.tabTextActive : styles.tabTextInactive}>
            Historique
          </Text>
        </Pressable>
      </View>

      <Animated.View style={{ flex: 1, opacity: tabFade }}>
        {tab === 'transactions' ? (
          <>
            <View style={styles.form}>
              {editingId && (
                <View style={styles.editingBanner}>
                  <Text style={styles.editingBannerText}>Modification d'une transaction</Text>
                  <Pressable onPress={resetForm}>
                    <Text style={styles.editingBannerCancel}>Annuler</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeChip, formType === 'entree' && styles.typeChipEntreeActive]}
                  onPress={() => handleFormTypeChange('entree')}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      formType === 'entree' && { color: COLOR_GOOD, fontWeight: '700' },
                    ]}
                  >
                    Entrée
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.typeChip, formType === 'sortie' && styles.typeChipSortieActive]}
                  onPress={() => handleFormTypeChange('sortie')}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      formType === 'sortie' && { color: COLOR_CRITICAL, fontWeight: '700' },
                    ]}
                  >
                    Sortie
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {categoriesFor(formType).map((cat) => {
                  const selected = cat.key === formCategory;
                  return (
                    <Pressable
                      key={cat.key}
                      onPress={() => setFormCategory(cat.key)}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={16}
                        color={selected ? TEXT_ON_GRAPHITE : TEXT_INK_MUTED}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable style={styles.personalToggle} onPress={() => setFormPersonal(!formPersonal)}>
                <Ionicons
                  name={formPersonal ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={formPersonal ? TEXT_INK : TEXT_INK_MUTED}
                />
                <Text style={[styles.personalToggleText, formPersonal && styles.personalToggleTextActive]}>
                  {formType === 'entree'
                    ? 'Remboursement personnel (réduit ta dette)'
                    : 'Retrait personnel (augmente ta dette)'}
                </Text>
              </Pressable>

              <GraphiteCard style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Description (ex: Salaire, Courses...)"
                  placeholderTextColor={TEXT_ON_GRAPHITE_MUTED}
                  value={label}
                  onChangeText={setLabel}
                />
              </GraphiteCard>
              <GraphiteCard style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  placeholder="Montant"
                  placeholderTextColor={TEXT_ON_GRAPHITE_MUTED}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </GraphiteCard>

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <View style={styles.buttonsRow}>
                <AnimatedButton style={styles.button} onPress={handleSaveTransaction}>
                  <Text style={[styles.buttonText, { color: formType === 'entree' ? COLOR_GOOD : COLOR_CRITICAL }]}>
                    {editingId ? 'Enregistrer' : formType === 'entree' ? '+ Ajouter' : '- Ajouter'}
                  </Text>
                </AnimatedButton>
                {editingId && (
                  <AnimatedButton style={styles.button} onPress={() => handleDelete(editingId)}>
                    <Text style={[styles.buttonText, { color: COLOR_CRITICAL }]}>Supprimer</Text>
                  </AnimatedButton>
                )}
              </View>
            </View>

            <FlatList
              style={styles.list}
              data={transactions}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                transactionsLoading ? (
                  <ActivityIndicator style={{ marginTop: 20 }} color={TEXT_INK} />
                ) : transactionsError ? (
                  <Text style={styles.errorText}>Erreur: {transactionsError}</Text>
                ) : (
                  <Text style={styles.emptyText}>Aucune transaction pour l'instant</Text>
                )
              }
              renderItem={({ item }) => {
                const info = categoryInfo(item.type, item.category);
                return (
                  <GraphiteCard style={styles.transactionRow}>
                    <Pressable style={styles.transactionMain} onPress={() => startEdit(item)}>
                      <View style={styles.transactionIconWrap}>
                        <Ionicons name={info.icon} size={18} color={TEXT_ON_GRAPHITE} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.transactionLabelRow}>
                          <Text style={styles.transactionLabel}>{item.label}</Text>
                          {item.personal && (
                            <View style={styles.personalBadge}>
                              <Text style={styles.personalBadgeText}>Perso</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.transactionAuthor}>
                          {info.label} · {item.author}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.transactionRight}>
                      <Text
                        style={[
                          styles.transactionAmount,
                          { color: item.type === 'entree' ? COLOR_GOOD : COLOR_CRITICAL },
                        ]}
                      >
                        {item.type === 'entree' ? '+' : '-'}
                        {item.amount.toFixed(2)} €
                      </Text>
                      <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} style={styles.trashButton}>
                        <Ionicons name="trash-outline" size={16} color={TEXT_ON_GRAPHITE_MUTED} />
                      </Pressable>
                    </View>
                  </GraphiteCard>
                );
              }}
            />
          </>
        ) : (
          <View style={styles.historyContainer}>
            <GraphiteCard style={styles.balanceBlock}>
              <Text style={styles.balanceLabel}>Ton solde personnel</Text>
              <AnimatedBalance value={personalBalance} style={styles.balanceValue} />
              <Text style={[styles.statusText, { color: isInDebt ? COLOR_CRITICAL : COLOR_GOOD }]}>
                {isInDebt
                  ? `Tu dois ${Math.abs(personalBalance).toFixed(2)} €`
                  : 'Tu es en positif'}
              </Text>
              <Text style={styles.balanceHint}>
                Basé sur tes retraits et remboursements personnels
              </Text>
            </GraphiteCard>

            <View style={styles.periodRow}>
              {PERIOD_OPTIONS.map((opt) => {
                const selected = opt.key === periodFilter;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setPeriodFilter(opt.key)}
                    style={[styles.periodChip, selected && styles.periodChipSelected]}
                  >
                    <Text style={[styles.periodChipText, selected && styles.periodChipTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {visibleHistoryPoints.length === 0 ? (
              <Text style={styles.emptyText}>
                Aucune transaction sur cette période
              </Text>
            ) : (
              <>
                <Text style={styles.chartCaption}>
                  {selectedPoint
                    ? `${selectedPoint.label} — Solde: ${selectedPoint.balance.toFixed(2)} €`
                    : ''}
                </Text>

                <GraphiteCard style={styles.chartWrapper}>
                  <View style={styles.zeroLine} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chartBars}>
                      {visibleHistoryPoints.map((point) => {
                        const barHeight = Math.max(
                          3,
                          (Math.abs(point.balance) / maxAbsBalance) * (CHART_HEIGHT / 2)
                        );
                        const isPositive = point.balance >= 0;
                        const isSelected =
                          point.id ===
                          (selectedPointId ?? visibleHistoryPoints[visibleHistoryPoints.length - 1].id);

                        return (
                          <Pressable
                            key={point.id}
                            style={styles.barTouchTarget}
                            onPress={() => setSelectedPointId(point.id)}
                          >
                            <View style={styles.topHalf}>
                              {isPositive && (
                                <View
                                  style={[
                                    styles.bar,
                                    styles.barUp,
                                    {
                                      height: barHeight,
                                      backgroundColor: COLOR_GOOD,
                                      opacity: isSelected ? 1 : 0.6,
                                    },
                                  ]}
                                />
                              )}
                            </View>
                            <View style={styles.bottomHalf}>
                              {!isPositive && (
                                <View
                                  style={[
                                    styles.bar,
                                    styles.barDown,
                                    {
                                      height: barHeight,
                                      backgroundColor: COLOR_CRITICAL,
                                      opacity: isSelected ? 1 : 0.6,
                                    },
                                  ]}
                                />
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </GraphiteCard>

                <Text style={styles.legendText}>
                  Vert = solde positif · Rouge = tu dois de l'argent · touche une
                  barre pour voir le détail
                </Text>
              </>
            )}
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : null),
    backgroundColor: COLOR_PAGE,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: COLOR_PAGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  graphiteCard: {
    borderRadius: 20,
    ...BEVEL,
  },
  graphiteFill: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...BEVEL,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
  },
  brandRowCompact: {
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_INK,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  errorText: {
    color: COLOR_CRITICAL,
    marginBottom: 10,
  },
  switchAuthLink: {
    marginTop: 18,
  },
  switchAuthText: {
    fontSize: 13,
    color: TEXT_INK_MUTED,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    width: '100%',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_INK,
  },
  logoutText: {
    color: TEXT_INK_MUTED,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  balanceBlock: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 15,
    color: TEXT_ON_GRAPHITE_MUTED,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  balanceHint: {
    fontSize: 12,
    color: TEXT_ON_GRAPHITE_MUTED,
    marginTop: 6,
  },
  benefitBlock: {
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 20,
  },
  benefitValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1a1a1c',
    ...BEVEL,
  },
  tabInactive: {
    backgroundColor: LIGHT_CARD_BG,
    borderWidth: 1,
    borderColor: LIGHT_CARD_BORDER,
  },
  tabTextActive: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_ON_GRAPHITE,
  },
  tabTextInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_INK_MUTED,
  },
  form: {
    marginBottom: 20,
  },
  editingBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  editingBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_INK,
  },
  editingBannerCancel: {
    fontSize: 13,
    color: TEXT_INK_MUTED,
    textDecorationLine: 'underline',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: LIGHT_CARD_BG,
    borderWidth: 1,
    borderColor: LIGHT_CARD_BORDER,
  },
  typeChipEntreeActive: {
    backgroundColor: '#eaf6ea',
    borderColor: COLOR_GOOD,
  },
  typeChipSortieActive: {
    backgroundColor: '#faeaea',
    borderColor: COLOR_CRITICAL,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_INK_MUTED,
  },
  categoryRow: {
    paddingBottom: 4,
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: LIGHT_CARD_BG,
    borderWidth: 1,
    borderColor: LIGHT_CARD_BORDER,
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#1a1a1c',
    borderColor: '#1a1a1c',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_INK_MUTED,
  },
  categoryChipTextSelected: {
    color: TEXT_ON_GRAPHITE,
  },
  personalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  personalToggleText: {
    fontSize: 13,
    color: TEXT_INK_MUTED,
    flexShrink: 1,
  },
  personalToggleTextActive: {
    color: TEXT_INK,
    fontWeight: '600',
  },
  inputCard: {
    marginBottom: 10,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: TEXT_ON_GRAPHITE,
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: TEXT_INK_MUTED,
    marginTop: 20,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  transactionMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  transactionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  trashButton: {
    marginTop: 8,
  },
  transactionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionLabel: {
    fontSize: 15,
    color: TEXT_ON_GRAPHITE,
  },
  personalBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  personalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_ON_GRAPHITE_MUTED,
    letterSpacing: 0.5,
  },
  transactionAuthor: {
    fontSize: 12,
    color: TEXT_ON_GRAPHITE_MUTED,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: LIGHT_CARD_BG,
    borderWidth: 1,
    borderColor: LIGHT_CARD_BORDER,
  },
  periodChipSelected: {
    backgroundColor: '#1a1a1c',
    borderColor: '#1a1a1c',
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_INK_MUTED,
  },
  periodChipTextSelected: {
    color: TEXT_ON_GRAPHITE,
  },
  chartCaption: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_INK,
    marginBottom: 12,
    textAlign: 'center',
  },
  chartWrapper: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
  },
  zeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CHART_HEIGHT / 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  barTouchTarget: {
    width: BAR_WIDTH,
    height: CHART_HEIGHT,
    marginRight: BAR_GAP,
  },
  topHalf: {
    height: CHART_HEIGHT / 2,
    justifyContent: 'flex-end',
  },
  bottomHalf: {
    height: CHART_HEIGHT / 2,
    justifyContent: 'flex-start',
  },
  bar: {
    width: BAR_WIDTH,
  },
  barUp: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barDown: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: TEXT_INK_MUTED,
    textAlign: 'center',
    marginTop: 10,
  },
});
