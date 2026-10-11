# Health Connect + WorkManager ship their own consumer rules. Keep our worker class name (WorkManager instantiates it by name).
-keep class com.silvertibby.pethostage.sync.SyncWorker { *; }
