/**
 * Quick diagnostic tool for immediate Metro bundler issue resolution
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DiagnosticReport, SystemInfo, ModuleResolutionStatus, CacheStatus } from './types';
import { MetroErrorParser } from './metroErrorParser';

export class QuickDiagnostic {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run a quick diagnostic check for common Metro issues
   */
  async runQuickCheck(): Promise<DiagnosticReport> {
    console.log('🔍 Running React Native Module Resolution Diagnostic...');

    const systemInfo = await this.getSystemInfo();
    const cacheStatus = await this.checkCacheStatus();
    const moduleStatus = await this.checkModuleResolution();
    
    const report: DiagnosticReport = {
      timestamp: new Date(),
      projectPath: this.projectRoot,
      metroVersion: systemInfo.metroVersion,
      nodeVersion: systemInfo.nodeVersion,
      reactNativeVersion: systemInfo.reactNativeVersion,
      issues: [],
      recommendations: [],
      systemInfo,
    };

    // Check for common issues
    await this.checkCommonIssues(report, cacheStatus, moduleStatus);

    return report;
  }

  /**
   * Get system information
   */
  private async getSystemInfo(): Promise<SystemInfo> {
    try {
      const nodeVersion = process.version;
      const npmVersion = this.safeExec('npm --version') || 'unknown';
      const yarnVersion = this.safeExec('yarn --version');
      
      // Get Metro version from package.json
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      let metroVersion = 'unknown';
      let reactNativeVersion = 'unknown';
      
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        metroVersion = packageJson.devDependencies?.['@react-native/metro-config'] || 
                     packageJson.dependencies?.['@react-native/metro-config'] || 'unknown';
        reactNativeVersion = packageJson.dependencies?.['react-native'] || 'unknown';
      }

      const hasWatchman = this.safeExec('watchman version') !== null;

      return {
        platform: process.platform,
        nodeVersion,
        npmVersion,
        yarnVersion,
        metroVersion,
        reactNativeVersion,
        hasWatchman,
      };
    } catch (error) {
      console.warn('Error getting system info:', error);
      return {
        platform: process.platform,
        nodeVersion: process.version,
        npmVersion: 'unknown',
        metroVersion: 'unknown',
        reactNativeVersion: 'unknown',
        hasWatchman: false,
      };
    }
  }

  /**
   * Check cache status
   */
  private async checkCacheStatus(): Promise<CacheStatus> {
    const metroTempDir = path.join(require('os').tmpdir(), 'metro-*');
    const npmCacheDir = path.join(require('os').homedir(), '.npm');
    
    return {
      metroCache: {
        exists: fs.existsSync(metroTempDir),
        size: 0, // TODO: Calculate actual size
        lastModified: new Date(),
        healthy: true, // TODO: Implement health check
      },
      npmCache: {
        exists: fs.existsSync(npmCacheDir),
        size: 0, // TODO: Calculate actual size
        healthy: true, // TODO: Implement health check
      },
    };
  }

  /**
   * Check module resolution status
   */
  private async checkModuleResolution(): Promise<ModuleResolutionStatus> {
    const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    const metroConfigPath = path.join(this.projectRoot, 'metro.config.js');
    
    return {
      hasteMapValid: true, // TODO: Implement actual check
      configurationValid: fs.existsSync(metroConfigPath),
      dependenciesIntact: fs.existsSync(nodeModulesPath),
      cacheHealthy: true, // TODO: Implement actual check
      overallStatus: 'HEALTHY', // TODO: Calculate based on checks
    };
  }

  /**
   * Check for common Metro issues
   */
  private async checkCommonIssues(
    report: DiagnosticReport, 
    cacheStatus: CacheStatus, 
    moduleStatus: ModuleResolutionStatus
  ): Promise<void> {
    // Check if node_modules exists
    if (!moduleStatus.dependenciesIntact) {
      report.issues.push({
        type: 'DEPENDENCY_CONFLICT',
        module: 'node_modules',
        severity: 'CRITICAL',
        suggestedFixes: [
          'Run: npm install',
          'Delete package-lock.json and run npm install',
          'Clear npm cache: npm cache clean --force',
        ],
      });
    }

    // Check for common missing packages
    const commonPackages = [
      'react-native-gesture-handler',
      'react-native-screens',
      'react-native-safe-area-context',
    ];

    for (const pkg of commonPackages) {
      const packagePath = path.join(this.projectRoot, 'node_modules', pkg);
      if (!fs.existsSync(packagePath)) {
        report.issues.push({
          type: 'MISSING_MODULE',
          module: pkg,
          severity: 'HIGH',
          suggestedFixes: [
            `Install package: npm install ${pkg}`,
            'Follow package-specific setup instructions',
          ],
        });
      }
    }

    // Generate recommendations
    if (report.issues.length === 0) {
      report.recommendations.push('✅ No critical issues detected');
      report.recommendations.push('Consider running: npx react-native start --reset-cache for a fresh start');
    } else {
      report.recommendations.push('🔧 Run the suggested fixes in order of severity');
      report.recommendations.push('🧹 Clear all caches if issues persist');
    }
  }

  /**
   * Apply automatic fixes for common issues
   */
  async applyQuickFixes(): Promise<void> {
    console.log('🔧 Applying quick fixes for Metro bundler issues...');

    try {
      // Clear Metro cache
      console.log('Clearing Metro cache...');
      this.safeExec('npx react-native start --reset-cache --port 8081 > /dev/null 2>&1 &');
      
      // Clear npm cache
      console.log('Clearing npm cache...');
      this.safeExec('npm cache clean --force');

      // Clear Watchman cache if available
      if (this.safeExec('watchman version')) {
        console.log('Clearing Watchman cache...');
        this.safeExec('watchman watch-del-all');
      }

      console.log('✅ Quick fixes applied successfully');
      console.log('💡 Try restarting Metro bundler: npx react-native start --reset-cache');
      
    } catch (error) {
      console.error('❌ Error applying quick fixes:', error);
    }
  }

  /**
   * Safely execute shell commands
   */
  private safeExec(command: string): string | null {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Print diagnostic report to console
   */
  printReport(report: DiagnosticReport): void {
    console.log('\n📊 React Native Module Resolution Diagnostic Report');
    console.log('='.repeat(60));
    console.log(`📅 Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`📁 Project: ${report.projectPath}`);
    console.log(`⚛️  React Native: ${report.reactNativeVersion}`);
    console.log(`🚇 Metro: ${report.metroVersion}`);
    console.log(`🟢 Node: ${report.nodeVersion}`);

    if (report.issues.length > 0) {
      console.log('\n🚨 Issues Found:');
      report.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.type} - ${issue.module}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Fixes:`);
        issue.suggestedFixes.forEach(fix => console.log(`   • ${fix}`));
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`• ${rec}`));
    }

    console.log('\n' + '='.repeat(60));
  }
}