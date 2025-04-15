import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Dimensions, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  runOnJS 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height } = Dimensions.get('window');

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(height);
  
  // Animation when visibility changes
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { 
        damping: 20,
        stiffness: 90
      });
    } else {
      translateY.value = withTiming(height, { 
        duration: 300 
      });
    }
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    };
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer, 
            animatedStyle,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Privacy Policy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#4B2E83" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.policyTitle}>Privacy Policy</Text>
            <Text style={styles.policyText}>
              This privacy policy applies to the DinnerParty app (hereby referred to as "Application") for mobile devices that was created by Ian Carscadden (hereby referred to as "Service Provider") as a Free service. This service is intended for use "AS IS".
            </Text>

            <Text style={styles.sectionTitle}>Information Collection and Use</Text>
            <Text style={styles.policyText}>
              The Application collects information when you download and use it. This information may include information such as
            </Text>
            <Text style={styles.policyText}>
              • Your device's Internet Protocol address (e.g. IP address){'\n'}
              • The pages of the Application that you visit, the time and date of your visit, the time spent on those pages{'\n'}
              • The time spent on the Application{'\n'}
              • The operating system you use on your mobile device
            </Text>
            <Text style={styles.policyText}>
              The Application does not gather precise information about the location of your mobile device.
            </Text>
            <Text style={styles.policyText}>
              The Service Provider may use the information you provided to contact you from time to time to provide you with important information, required notices and marketing promotions.
            </Text>
            <Text style={styles.policyText}>
              For a better experience, while using the Application, the Service Provider may require you to provide us with certain personally identifiable information, including but not limited to Email. The information that the Service Provider request will be retained by them and used as described in this privacy policy.
            </Text>

            <Text style={styles.sectionTitle}>Third Party Access</Text>
            <Text style={styles.policyText}>
              Only aggregated, anonymized data is periodically transmitted to external services to aid the Service Provider in improving the Application and their service. The Service Provider may share your information with third parties in the ways that are described in this privacy statement.
            </Text>
            <Text style={styles.policyText}>
              Please note that the Application utilizes third-party services that have their own Privacy Policy about handling data. Below are the links to the Privacy Policy of the third-party service providers used by the Application:
            </Text>
            <Text style={styles.policyText}>
              • Expo
            </Text>
            <Text style={styles.policyText}>
              The Service Provider may disclose User Provided and Automatically Collected Information:
            </Text>
            <Text style={styles.policyText}>
              • as required by law, such as to comply with a subpoena, or similar legal process;{'\n'}
              • when they believe in good faith that disclosure is necessary to protect their rights, protect your safety or the safety of others, investigate fraud, or respond to a government request;{'\n'}
              • with their trusted services providers who work on their behalf, do not have an independent use of the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy statement.
            </Text>

            <Text style={styles.sectionTitle}>Opt-Out Rights</Text>
            <Text style={styles.policyText}>
              You can stop all collection of information by the Application easily by uninstalling it. You may use the standard uninstall processes as may be available as part of your mobile device or via the mobile application marketplace or network.
            </Text>

            <Text style={styles.sectionTitle}>Data Retention Policy</Text>
            <Text style={styles.policyText}>
              The Service Provider will retain User Provided data for as long as you use the Application and for a reasonable time thereafter. If you'd like them to delete User Provided Data that you have provided via the Application, please contact them at ianmcarscadden@gmail.com and they will respond in a reasonable time.
            </Text>

            <Text style={styles.sectionTitle}>Children</Text>
            <Text style={styles.policyText}>
              The Service Provider does not use the Application to knowingly solicit data from or market to children under the age of 13.
            </Text>
            <Text style={styles.policyText}>
              The Application does not address anyone under the age of 13. The Service Provider does not knowingly collect personally identifiable information from children under 13 years of age. In the case the Service Provider discover that a child under 13 has provided personal information, the Service Provider will immediately delete this from their servers. If you are a parent or guardian and you are aware that your child has provided us with personal information, please contact the Service Provider (ianmcarscadden@gmail.com) so that they will be able to take the necessary actions.
            </Text>

            <Text style={styles.sectionTitle}>Security</Text>
            <Text style={styles.policyText}>
              The Service Provider is concerned about safeguarding the confidentiality of your information. The Service Provider provides physical, electronic, and procedural safeguards to protect information the Service Provider processes and maintains.
            </Text>

            <Text style={styles.sectionTitle}>Changes</Text>
            <Text style={styles.policyText}>
              This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval of all changes.
            </Text>
            <Text style={styles.policyText}>
              This privacy policy is effective as of 2025-04-08
            </Text>

            <Text style={styles.sectionTitle}>Your Consent</Text>
            <Text style={styles.policyText}>
              By using the Application, you are consenting to the processing of your information as set forth in this Privacy Policy now and as amended by us.
            </Text>

            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.policyText}>
              If you have any questions regarding privacy while using the Application, or have questions about the practices, please contact the Service Provider via email at ianmcarscadden@gmail.com.
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: height * 0.9,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    paddingHorizontal: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4B2E83',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  policyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B2E83',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B2E83',
    marginTop: 20,
    marginBottom: 10,
  },
  policyText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
});

export default PrivacyPolicyModal; 