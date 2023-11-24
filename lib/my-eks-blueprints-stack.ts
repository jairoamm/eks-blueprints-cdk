// lib/my-eks-blueprints-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as blueprints from '@aws-quickstart/eks-blueprints';

export default class ClusterConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const account = props?.env?.account!;
    const region = props?.env?.region!;


    const addOns: Array<blueprints.ClusterAddOn> = [
        new blueprints.VeleroAddOn(),
        new blueprints.ArgoCDAddOn(),
        new blueprints.AwsLoadBalancerControllerAddOn(),
        
        // KARPENTER
        new blueprints.KarpenterAddOn({
                    requirements: [
                        { key: 'node.kubernetes.io/instance-type', op: 'In', vals: ['m5.large','m5.xlarge','m5.2xlarge','m5.4xlarge','m5.8xlarge','m5.12xlarge'] },
                        { key: 'topology.kubernetes.io/zone', op: 'NotIn', vals: ['us-west-2c']},
                        { key: 'kubernetes.io/arch', op: 'In', vals: ['amd64','arm64']},
                        { key: 'karpenter.sh/capacity-type', op: 'In', vals: ['on-demand']},
                    ],
                    subnetTags: {
                        "Name": "cluster-stack/cluster-stack-vpc/PrivateSubnet*",
                    },
                    securityGroupTags: {
                        "kubernetes.io/cluster/cluster-stack": "owned",
                    },
                    limits: {
                        resources:{
                        "cpu":1000,
                        "memory": "1000Gi"
                        }
                    },
                    taints: [{
                        key: "workload",
                        value: "test",
                        effect: "NoSchedule",
                    }],
                    consolidation: { enabled: true },
                    ttlSecondsUntilExpired: 2592000,
                    weight: 20,
                    interruptionHandling: true,
        }),
        
        new blueprints.EbsCsiDriverAddOn({
            kmsKeys: [
              blueprints.getResource(
                (context) =>
                  new kms.Key(context.scope, "ebs-csi-driver-key", {
                    alias: "ebs-csi-driver-key",
                  })
              ),
            ],
          })
        ];    

    const blueprint = blueprints.EksBlueprint.builder() 
    .version('auto')
    .account(account)
    .region(region)
    .addOns(...addOns)
    .teams()
    .build(scope, id+'-stack');
  }
}