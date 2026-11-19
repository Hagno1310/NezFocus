import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  parseMessage,
  type Block,
  type Inline,
} from '../../domain/messages/markdown';
import {
  fontFamily,
  radius,
  size,
  typography,
  useTheme,
  type Colors,
} from '../theme';
import { Text } from './Text';

const open = (url: string) => void Linking.openURL(url).catch(() => {});

// C-10 › Nội dung đặc biệt for one inline run. `hidden`: under a spoiler not yet tapped, every
// colour is the cover's and links do nothing.
function Runs({
  nodes,
  colors,
  hidden,
}: {
  nodes: Inline[];
  colors: Colors;
  hidden: boolean;
}): ReactNode {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text':
        return n.text;
      case 'bold':
        return (
          <Text key={i} weight="700" style={hidden && hide(colors)}>
            <Runs nodes={n.children} colors={colors} hidden={hidden} />
          </Text>
        );
      case 'italic':
        return (
          <Text key={i} style={[styles.italic, hidden && hide(colors)]}>
            <Runs nodes={n.children} colors={colors} hidden={hidden} />
          </Text>
        );
      case 'strike':
        return (
          <Text key={i} style={[styles.strike, hidden && hide(colors)]}>
            <Runs nodes={n.children} colors={colors} hidden={hidden} />
          </Text>
        );
      case 'code':
        return (
          <Text
            key={i}
            style={[
              styles.code,
              { backgroundColor: colors['surface-2'] },
              hidden && hide(colors),
            ]}
          >
            {n.text}
          </Text>
        );
      case 'link':
        return hidden ? (
          <Text key={i} style={hide(colors)}>
            {n.url}
          </Text>
        ) : (
          <Text
            key={i}
            color="primary"
            accessibilityRole="link"
            onPress={() => open(n.url)}
            style={styles.link}
          >
            {n.url}
          </Text>
        );
      case 'spoiler':
        return <Spoiler key={i} nodes={n.children} colors={colors} />;
    }
  });
}

const hide = (colors: Colors) => ({
  color: colors['surface-3'],
  backgroundColor: colors['surface-3'],
  textDecorationLine: 'none' as const,
});

// C-10 Spoiler: a `surface-3` block over the text until tapped.
function Spoiler({ nodes, colors }: { nodes: Inline[]; colors: Colors }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  return (
    <Text
      accessibilityRole={shown ? undefined : 'button'}
      accessibilityLabel={shown ? undefined : t('chat.spoiler')}
      onPress={shown ? undefined : () => setShown(true)}
      style={shown ? { backgroundColor: colors['surface-3'] } : hide(colors)}
    >
      <Runs nodes={nodes} colors={colors} hidden={!shown} />
    </Text>
  );
}

function BlockView({ block, colors }: { block: Block; colors: Colors }) {
  switch (block.t) {
    case 'paragraph':
      return (
        <Text>
          <Runs nodes={block.children} colors={colors} hidden={false} />
        </Text>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <View
            style={[
              styles.quoteBar,
              { backgroundColor: colors['border-input'] },
            ]}
          />
          <Text color="text-secondary" style={styles.flex}>
            <Runs nodes={block.children} colors={colors} hidden={false} />
          </Text>
        </View>
      );
    // Scrolls sideways, never wraps; the gesture-handler ScrollView keeps the drawer swipe
    // off it (SRS 3.1).
    case 'codeblock':
      return (
        <View
          style={[
            styles.codeBlock,
            {
              backgroundColor: colors['surface-2'],
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text variant="mono" style={styles.codePad}>
              {block.text}
            </Text>
          </ScrollView>
        </View>
      );
  }
}

// REQ-MSG-02 content of a MessageBubble. The 2000-character counter counts the typed text,
// marks included (C-11), never this rendering.
export function MessageText({ content }: { content: string }) {
  const { colors } = useTheme();
  const blocks = useMemo(() => parseMessage(content), [content]);
  if (blocks.length === 1 && blocks[0]!.t === 'paragraph')
    return <BlockView block={blocks[0]!} colors={colors} />;
  return (
    <View style={styles.blocks}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} colors={colors} />
      ))}
    </View>
  );
}

const QUOTE_BAR = 4;
const CODE_PAD = 12;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  blocks: { gap: 4 },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  link: { textDecorationLine: 'underline' },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: typography.mono.fontSize,
  },
  quote: { flexDirection: 'row', gap: 12 },
  quoteBar: { width: QUOTE_BAR, borderRadius: radius.badge },
  codeBlock: {
    borderWidth: size.hairline,
    borderRadius: radius.input,
    overflow: 'hidden',
  },
  codePad: { padding: CODE_PAD },
});
