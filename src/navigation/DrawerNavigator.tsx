// src/navigation/DrawerNavigator.tsx

import React from 'react';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
// Importa o Stack Navigator e seus tipos
import AppNavigator, { RootStackParamList } from './AppNavigator'; 
// Importa o componente de conteúdo do menu lateral
import CustomDrawerContent from './CustomDrawerContent'; 

// Definição do tipo para o Drawer Navigator
export type RootDrawerParamList = {
  MainStack: RootStackParamList; 
};

const Drawer = createDrawerNavigator<RootDrawerParamList>();

// Função auxiliar para renderizar o conteúdo do Drawer
const renderDrawerContent = (props: DrawerContentComponentProps) => {
  return <CustomDrawerContent {...props} />;
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false, 
        drawerType: 'front', 
        overlayColor: 'rgba(0, 0, 0, 0.6)',
        drawerStyle: {
          width: '85%',
        },
      }}
      drawerContent={renderDrawerContent} 
      initialRouteName="MainStack"
    >
      <Drawer.Screen
        name="MainStack" 
        component={AppNavigator}
      />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;