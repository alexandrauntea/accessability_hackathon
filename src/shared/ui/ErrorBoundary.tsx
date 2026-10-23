import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { Card } from './Card';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    router.replace('/');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Card style={styles.card}>
            <AppText variant="h2" accessibilityRole="alert">
              {this.props.fallbackTitle ?? 'Something unexpected happened'}
            </AppText>
            <AppText variant="muted">
              Your health data and preferences are safely preserved. You can retry this screen or return to the Today screen.
            </AppText>
            <View style={styles.buttonRow}>
              <AppButton
                label="Retry"
                hint="Reload this screen"
                onPress={this.handleRetry}
              />
              <AppButton
                kind="secondary"
                label="Go to Today"
                hint="Navigate to the Today screen"
                onPress={this.handleGoHome}
              />
            </View>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    gap: 16,
    padding: 24,
  },
  buttonRow: {
    gap: 12,
    marginTop: 8,
  },
});
